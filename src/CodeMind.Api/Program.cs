using System.Text;
using CodeMind.Api.Hubs;
using CodeMind.Api.Middlewares;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

// Serilog Bootstrap Logger (Uygulama ayağa kalkarken ilk logları yakalar)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("CodeMind API başlatılıyor...");

    // Kök dizindeki (root) .env dosyasını bulabilmesi için TraversePath kullanıyoruz
    DotNetEnv.Env.TraversePath().Load();

    var builder = WebApplication.CreateBuilder(args);

    // Serilog'u ana Host logger olarak yapılandır (appsettings.json ve DI servislerini okur)
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    // Multipart ve İstek Gövdesi Boyut Limiti (ZIP için 60MB)
    builder.Services.Configure<FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 60 * 1024 * 1024;
    });
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 60 * 1024 * 1024;
    });

    // Add services to the container.
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<ITempKeyVaultService, TempKeyVaultService>();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IMessageProducer, KafkaProducer>();
    builder.Services.AddSingleton<IMinIOService, MinIOService>();
    builder.Services.AddScoped<IDocumentService, DocumentService>();
    builder.Services.AddSignalR();
    builder.Services.AddSingleton<IMessageConsumer, CodeMind.Infrastructure.Messaging.KafkaConsumer>();
    builder.Services.AddHostedService<CodeMind.Api.HostedServices.AnalysisResultBackgroundService>();
    builder.Services.Configure<HostOptions>(options =>
    {
        options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
    });
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
                ValidAudience = builder.Configuration["JwtSettings:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:Secret"]!))
            };
        });
    builder.Services.AddAuthorization();
    builder.Services.AddControllers();
    builder.Services.AddAutoMapper(cfg => 
    {
        cfg.AddProfile<CodeMind.Domain.Mappings.MappingProfile>();
    });
    builder.Services.AddOpenApi();
    builder.Services.AddSwaggerGen();
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    var app = builder.Build();

    // CORS en başta olmalıdır (Tüm istekler ve SignalR Negotiate için)
    app.UseCors("AllowFrontend");

    // Serilog HTTP Request Logging (Tüm gelen HTTP isteklerini structured olarak kaydeder)
    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
            diagnosticContext.Set("RemoteIpAddress", httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers["User-Agent"].ToString());

            if (httpContext.User.Identity?.IsAuthenticated == true)
            {
                var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var tenantId = httpContext.User.FindFirst("TenantId")?.Value;
                var email = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

                if (!string.IsNullOrEmpty(userId)) diagnosticContext.Set("UserId", userId);
                if (!string.IsNullOrEmpty(tenantId)) diagnosticContext.Set("TenantId", tenantId);
                if (!string.IsNullOrEmpty(email)) diagnosticContext.Set("UserEmail", email);
            }
        };
    });

    // Global Exception Handler (Tüm beklenmeyen hataları standart ApiResponse ile yakalar)
    app.UseMiddleware<GlobalExceptionMiddleware>();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    else
    {
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<AnalysisHub>("/analysis-hub");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "CodeMind API beklenmeyen bir hata sebebiyle sonlandı.");
}
finally
{
    Log.Information("CodeMind API kapatılıyor, bekleyen loglar diske/sunucuya yazılıyor...");
    Log.CloseAndFlush();
}
