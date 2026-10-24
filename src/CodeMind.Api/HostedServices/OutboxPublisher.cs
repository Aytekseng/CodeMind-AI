using System.Text.Json;
using CodeMind.Domain.Enums;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
namespace CodeMind.Api.HostedServices;
public sealed class OutboxPublisher(IServiceScopeFactory scopes, ILogger<OutboxPublisher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var producer = scope.ServiceProvider.GetRequiredService<IMessageProducer>();
                var messages = await db.OutboxMessages.IgnoreQueryFilters().Include(o => o.Document)
                    .Where(o => o.PublishedAt == null && (o.NextAttemptAt == null || o.NextAttemptAt <= DateTime.UtcNow))
                    .OrderBy(o => o.CreatedAt).Take(20).ToListAsync(stoppingToken);
                foreach (var message in messages)
                {
                    try
                    {
                        if (message.Document.Status == DocumentStatus.Pending)
                            await producer.ProduceAsync("file-uploads", JsonSerializer.Deserialize<JsonElement>(message.Payload));
                        message.PublishedAt = DateTime.UtcNow;
                    }
                    catch (Exception ex)
                    {
                        message.Attempts++;
                        message.NextAttemptAt = DateTime.UtcNow.AddSeconds(Math.Min(300, Math.Pow(2, Math.Min(message.Attempts, 8))));
                        logger.LogError(ex, "Outbox delivery failed for {DocumentId}; attempt {Attempt}", message.DocumentId, message.Attempts);
                    }
                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError(ex, "Outbox unavailable; retrying"); }
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }
}
