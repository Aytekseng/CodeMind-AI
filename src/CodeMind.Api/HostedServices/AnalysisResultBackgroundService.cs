using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using CodeMind.Domain.Events;

namespace CodeMind.Api.HostedServices;

// API katmanına Clean Architecture'nin kuralı, "Domain ve Infrastructure katmanında Web'e ait paket bulunamaz!" gereği servis yazılmıştır.
// Burada SignalR paketi kullanılmaktadır.
public class AnalysisResultBackgroundService : BackgroundService
{
    private readonly IMessageConsumer _messageConsumer;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<AnalysisHub> _hubContext;

    public AnalysisResultBackgroundService(IMessageConsumer messageConsumer, IServiceScopeFactory scopeFactory, IHubContext<AnalysisHub> hubContext)
    {
        _messageConsumer = messageConsumer;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _messageConsumer.StartConsumingAsync<AnalysisCompletedEvent>(
            "analysis-results", 
            async (eventData) => 
            {
                Console.WriteLine($"\n[C# Consumer] Kafka'dan yeni analiz sonucu alındı!");

                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var report = new AnalysisReport
                {
                    DocumentId = eventData.FileId,
                    Severity = eventData.Severity,
                    AiSuggestion = eventData.AiSuggestion
                };
                
                dbContext.AnalysisReports.Add(report);
                await dbContext.SaveChangesAsync(stoppingToken);
                Console.WriteLine($"[C# Consumer] Sonuç başarıyla DB'ye kaydedildi.");

                await _hubContext.Clients.All.SendAsync("ReceiveAnalysisResult", eventData.FileId, eventData.Severity, eventData.AiSuggestion, cancellationToken: stoppingToken);
                Console.WriteLine($"[C# Consumer] Arayüze bildirim komutu verildi!");

            }, 
            stoppingToken);
    }
}
