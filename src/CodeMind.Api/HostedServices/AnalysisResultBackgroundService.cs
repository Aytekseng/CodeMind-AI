using System.Text.Json;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Enums;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using CodeMind.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using CodeMind.Domain.Events;
using Microsoft.EntityFrameworkCore;
namespace CodeMind.Api.HostedServices;
public class AnalysisResultBackgroundService(IMessageConsumer consumer, IServiceScopeFactory scopes,
    IHubContext<AnalysisHub> hub, ILogger<AnalysisResultBackgroundService> logger) : BackgroundService
{
    protected override Task ExecuteAsync(CancellationToken stoppingToken) => consumer.StartConsumingAsync<AnalysisCompletedEvent>(
        "analysis-results", async result =>
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var vault = scope.ServiceProvider.GetRequiredService<ITempKeyVaultService>();
            var doc = await db.Documents.IgnoreQueryFilters().Include(d => d.Project)
                .FirstOrDefaultAsync(d => d.Id == result.FileId, stoppingToken);
            // Terminal transitions are immutable; duplicate deliveries and deleted jobs are harmless.
            if (doc == null || doc.Status is DocumentStatus.Cancelled or DocumentStatus.Completed or DocumentStatus.Failed) return;
            bool failed = !result.IsSuccess || !string.IsNullOrWhiteSpace(result.ErrorMessage);
            if (!failed && (result.Findings.Any(f => f.LineNumber < 1 || !new[] { "Kritik", "Yüksek", "Orta", "Düşük" }.Contains(f.Severity)) ||
                !new[] { "Kritik", "Yüksek", "Orta", "Düşük", "Temiz" }.Contains(result.Severity)))
                throw new InvalidOperationException("Invalid structured analysis result");
            doc.Status = failed ? DocumentStatus.Failed : DocumentStatus.Completed;
            doc.ErrorMessage = failed ? "Analiz tamamlanamadı. Anahtarınızı ve model erişimini kontrol edip dosyayı yeniden yükleyin." : null;
            if (!failed)
                db.AnalysisReports.Add(new AnalysisReport { Id = Guid.NewGuid(), DocumentId = doc.Id,
                    Severity = result.Severity, AiSuggestion = result.AiSuggestion, ModelUsed = result.ModelUsed,
                    FindingsJson = JsonSerializer.Serialize(result.Findings), FindingsCount = result.Findings.Count,
                    LineNumber = result.Findings.FirstOrDefault()?.LineNumber ?? 0 });
            try { await db.SaveChangesAsync(stoppingToken); }
            catch (DbUpdateConcurrencyException) { return; } // A cancellation/deletion or another consumer won.
            vault.RemoveKey(doc.Id);
            // Groups include the current security stamp. Revoked connections receive no further data.
            var recipients = await db.Users.IgnoreQueryFilters().Where(u => u.TenantId == doc.Project.TenantId &&
                !u.MustChangePassword && (u.Role == "Admin" || u.Role == "Auditor" || u.Id == doc.UploadedByUserId))
                .Select(u => new { u.Id, u.SecurityStamp }).ToListAsync(stoppingToken);
            var clients = hub.Clients.Groups(recipients.Select(u => AnalysisHub.UserGroup(u.Id, u.SecurityStamp)).ToList());
            try
            {
                if (failed) await clients.SendAsync("ReceiveAnalysisFailure", doc.Id.ToString(), doc.ErrorMessage,
                    doc.FileName, doc.ProjectId.ToString(), result.ModelUsed ?? "", cancellationToken: stoppingToken);
                else await clients.SendAsync("ReceiveAnalysisResult", doc.Id.ToString(), result.Severity, result.AiSuggestion,
                    doc.FileName, doc.ProjectId.ToString(), result.ModelUsed ?? "", cancellationToken: stoppingToken);
            }
            catch (Exception ex) { logger.LogWarning(ex, "Notification failed; persisted job can be read via REST"); }
        }, stoppingToken);
}
