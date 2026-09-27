using System;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using CodeMind.Domain.DTOs;

namespace CodeMind.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Anonymous";
            var tenantId = context.User?.FindFirst("TenantId")?.Value ?? "None";
            var path = context.Request.Path.Value;
            var method = context.Request.Method;

            if (ex is BadHttpRequestException or ArgumentException or InvalidOperationException or KeyNotFoundException)
            {
                _logger.LogWarning(ex, 
                    "İstemci hatası oluştu: {ErrorMessage} | Yol: {Method} {Path} | UserId: {UserId} | TenantId: {TenantId}", 
                    ex.Message, method, path, userId, tenantId);
            }
            else
            {
                _logger.LogError(ex, 
                    "Kritik sunucu hatası meydana geldi: {ErrorMessage} | Yol: {Method} {Path} | UserId: {UserId} | TenantId: {TenantId}", 
                    ex.Message, method, path, userId, tenantId);
            }

            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var statusCode = exception switch
        {
            BadHttpRequestException => (int)HttpStatusCode.BadRequest,
            ArgumentException or InvalidOperationException => (int)HttpStatusCode.BadRequest,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            _ => (int)HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = statusCode;

        var response = ApiResponse<object>.Fail(
            exception.Message,
            statusCode == 500 ? "Sunucu tarafında beklenmeyen bir hata meydana geldi." : exception.Message
        );

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(response, jsonOptions);

        await context.Response.WriteAsync(json);
    }
}
