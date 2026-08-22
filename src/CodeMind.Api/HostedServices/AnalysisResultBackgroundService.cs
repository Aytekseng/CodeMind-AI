using CodeMind.Domain.Entities;
using CodeMind.Domain.Enums;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using CodeMind.Domain.Events;
using Microsoft.EntityFrameworkCore;

namespace CodeMind.Api.HostedServices;

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
                Console.WriteLine($"\n[C# Consumer] Kafka'dan yeni analiz sonucu alındı! FileId: {eventData.FileId}");

                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // 1. Doküman durumunu güncelle
                var doc = await dbContext.Documents
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(d => d.Id == eventData.FileId, stoppingToken);

                if (doc != null)
                {
                    doc.Status = DocumentStatus.Completed;
                }

                // 2. Analiz Raporunu kaydet
                var report = new AnalysisReport
                {
                    Id = Guid.NewGuid(),
                    DocumentId = eventData.FileId,
                    Severity = eventData.Severity ?? "Medium",
                    AiSuggestion = eventData.AiSuggestion ?? "Analiz tamamlandı.",
                    CreatedAt = DateTime.UtcNow
                };
                
                dbContext.AnalysisReports.Add(report);
                await dbContext.SaveChangesAsync(stoppingToken);
                Console.WriteLine($"[C# Consumer] Sonuç başarıyla DB'ye kaydedildi.");

                // 3. SignalR ile frontend'e anlık bildir
                await _hubContext.Clients.All.SendAsync(
                    "ReceiveAnalysisResult",
                    eventData.FileId.ToString(),
                    eventData.Severity ?? "Medium",
                    eventData.AiSuggestion ?? "",
                    cancellationToken: stoppingToken
                );
                Console.WriteLine($"[C# Consumer] Arayüze SignalR bildirim komutu verildi!");
            }, 
            stoppingToken);
    }
}
