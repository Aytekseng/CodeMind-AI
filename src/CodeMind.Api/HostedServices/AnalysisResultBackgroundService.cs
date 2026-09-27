using CodeMind.Domain.Entities;
using CodeMind.Domain.Enums;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using CodeMind.Domain.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMind.Api.HostedServices;

public class AnalysisResultBackgroundService : BackgroundService
{
    private readonly IMessageConsumer _messageConsumer;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<AnalysisHub> _hubContext;
    private readonly ILogger<AnalysisResultBackgroundService> _logger;

    public AnalysisResultBackgroundService(
        IMessageConsumer messageConsumer, 
        IServiceScopeFactory scopeFactory, 
        IHubContext<AnalysisHub> hubContext,
        ILogger<AnalysisResultBackgroundService> logger)
    {
        _messageConsumer = messageConsumer;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AnalysisResultBackgroundService başlatıldı, 'analysis-results' kuyruğu dinleniyor...");

        try
        {
            await _messageConsumer.StartConsumingAsync<AnalysisCompletedEvent>(
                "analysis-results", 
                async (eventData) => 
                {
                    if (eventData == null) return;

                    try
                    {
                        _logger.LogInformation("Kafka'dan yeni analiz sonucu alındı. FileId: {FileId}, Severity: {Severity}", 
                            eventData.FileId, eventData.Severity);

                        using var scope = _scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        // 1. Doküman durumunu güncelle
                        var doc = await dbContext.Documents
                            .IgnoreQueryFilters()
                            .Include(d => d.Project)
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
                            ModelUsed = eventData.ModelUsed ?? "Llama 3"
                        };
                        
                        dbContext.AnalysisReports.Add(report);
                        await dbContext.SaveChangesAsync(stoppingToken);
                        
                        _logger.LogInformation("Analiz raporu veritabanına kaydedildi. ReportId: {ReportId}, DocumentId: {DocumentId}, Model: {ModelUsed}", 
                            report.Id, eventData.FileId, report.ModelUsed);

                        // 3. SignalR ile frontend'e anlık bildir (Dosya adı, Proje ID'si ve Kullanılan Model ile zenginleştirildi)
                        await _hubContext.Clients.All.SendAsync(
                            "ReceiveAnalysisResult",
                            eventData.FileId.ToString(),
                            eventData.Severity ?? "Medium",
                            eventData.AiSuggestion ?? "",
                            doc?.FileName ?? "",
                            doc?.ProjectId.ToString() ?? "",
                            eventData.ModelUsed ?? "Llama 3",
                            cancellationToken: stoppingToken
                        );

                        _logger.LogInformation("SignalR istemcilerine analiz tamamlandı bildirimi fırlatıldı. FileId: {FileId}, FileName: {FileName}, Model: {ModelUsed}", 
                            eventData.FileId, doc?.FileName, eventData.ModelUsed);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Kafka'dan alınan analiz sonucu işlenirken hata oluştu. FileId: {FileId}", eventData.FileId);
                    }
                }, 
                stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("AnalysisResultBackgroundService durduruluyor (CancellationRequested).");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AnalysisResultBackgroundService beklenmedik kritik bir hata ile karşılaştı.");
        }
    }
}
