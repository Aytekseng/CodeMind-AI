using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using System.Text;
using CodeMind.Api.Hubs;
using CodeMind.Api.Middlewares;
using CodeMind.Domain.Interfaces;
using CodeMind.Application.Services;
using CodeMind.Infrastructure.Data;
using CodeMind.Infrastructure.Security;
using CodeMind.Infrastructure.Storage;
using CodeMind.Infrastructure.Reporting;
using CodeMind.Infrastructure.Messaging;
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
    DotNetEnv.Env.NoClobber().TraversePath().Load();

    // QuestPDF Lisans ve Font Ayarları
    QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    QuestPDF.Settings.UseSystemFonts = true;
    QuestPDF.Settings.ThrowOnMissingFontFamilies = false;

    var builder = WebApplication.CreateBuilder(args);
    // Explicit mappings support the documented root .env in local development.
    builder.Configuration["JwtSettings:Secret"] = builder.Configuration["JwtSettings:Secret"] is { Length: > 0 } jwt ? jwt : Environment.GetEnvironmentVariable("JWT_SECRET");
    builder.Configuration["Worker:Secret"] = builder.Configuration["Worker:Secret"] is { Length: > 0 } worker ? worker : Environment.GetEnvironmentVariable("WORKER_SECRET");
    if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
    {
        var cs = new Npgsql.NpgsqlConnectionStringBuilder { Host = "localhost", Port = 5433,
            Database = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "codemind_db",
            Username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "codemind",
            Password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "" };
        builder.Configuration["ConnectionStrings:DefaultConnection"] = cs.ConnectionString;
    }
    builder.Configuration["KafkaSettings:BootstrapServers"] ??= Environment.GetEnvironmentVariable("KAFKA_BROKER") ?? "localhost:9094";
    builder.Configuration["MinIOSettings:Endpoint"] ??= Environment.GetEnvironmentVariable("MINIO_ENDPOINT") ?? "localhost:9000";
    builder.Configuration["MinIOSettings:AccessKey"] ??= Environment.GetEnvironmentVariable("MINIO_ROOT_USER");
    builder.Configuration["MinIOSettings:SecretKey"] ??= Environment.GetEnvironmentVariable("MINIO_ROOT_PASSWORD");
    var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "";
    var workerSecret = builder.Configuration["Worker:Secret"] ?? "";
    if (jwtSecret.Length < 32 || jwtSecret.Contains("CodeMind_Super_Secret") || workerSecret.Length < 32 || jwtSecret == workerSecret)
        throw new InvalidOperationException("Configure distinct random JWT_SECRET and WORKER_SECRET (at least 32 characters).");


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
    builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<ITempKeyVaultService, TempKeyVaultAdapter>();
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<IMessageProducer, KafkaMessageProducer>();
    builder.Services.AddSingleton<IMinIOService, MinioStorageAdapter>();
    builder.Services.AddScoped<IDocumentService, DocumentService>();
    builder.Services.AddScoped<ITeamService, TeamService>();
    builder.Services.AddSingleton<IPdfExportService, QuestPdfReportAdapter>();
    builder.Services.AddSignalR();
    builder.Services.AddSingleton<IMessageConsumer, KafkaMessageConsumer>();
    builder.Services.AddHostedService<CodeMind.Api.HostedServices.AnalysisResultBackgroundService>();
    builder.Services.AddHostedService<CodeMind.Api.HostedServices.OutboxPublisher>();
    builder.Services.AddHealthChecks().AddCheck<CodeMind.Api.Security.DatabaseHealthCheck>("database");
    builder.Services.Configure<HostOptions>(options =>
    {
        options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.StopHost;
    });
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    if (context.Request.Path.StartsWithSegments("/analysis-hub"))
                        context.Token = context.Request.Query["access_token"];
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    var claims = context.Principal!;
                    if (!Guid.TryParse(claims.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ||
                        !Guid.TryParse(claims.FindFirstValue("TenantId"), out var tenantId) || tenantId == Guid.Empty)
                    { context.Fail("Invalid identity"); return; }
                    var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    var user = await db.Users.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && u.TenantId == tenantId);
                    if (!CodeMind.Api.Security.SessionAuthorization.Matches(user, claims))
                        context.Fail("Session revoked");
                }
            };
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
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = 429;
        options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        options.AddPolicy("upload", context => RateLimitPartition.GetFixedWindowLimiter(
            context.User.FindFirstValue("TenantId") ?? "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    });
    builder.Services.AddControllers();
    builder.Services.AddAutoMapper(cfg => 
    {
        cfg.AddProfile<CodeMind.Application.Mappings.MappingProfile>();
    });
    builder.Services.AddOpenApi();
    builder.Services.AddSwaggerGen();
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            var origins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:3000,http://localhost:3050").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            policy.WithOrigins(origins)
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

    // Veritabanı Otomatik Migration ve Demo Seed Verisi (İlk açılışta veya Docker konteynerinde otomatik çalışır)
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var startupLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        await DbInitializer.InitializeAsync(dbContext, startupLogger, builder.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("SeedDemoData"));
    }

    // Configure the HTTP request pipeline.
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();

    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRateLimiter();
    app.Use(async (context, next) =>
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.FindFirstValue("MustChangePassword") == "True" &&
            !context.Request.Path.Equals(new PathString("/api/auth/profile")) && !context.Request.Path.Equals(new PathString("/api/auth/me")))
        { context.Response.StatusCode = 403; await context.Response.WriteAsJsonAsync(new { message = "Önce geçici parolanızı değiştirin." }); return; }
        await next(context);
    });
    app.MapControllers();
    app.MapHub<AnalysisHub>("/analysis-hub", options => options.CloseOnAuthenticationExpiration = true);
    app.MapHealthChecks("/health");

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "CodeMind API beklenmeyen bir hata sebebiyle sonlandı.");
    Environment.ExitCode = 1;
}
finally
{
    Log.Information("CodeMind API kapatılıyor, bekleyen loglar diske/sunucuya yazılıyor...");
    Log.CloseAndFlush();
}
