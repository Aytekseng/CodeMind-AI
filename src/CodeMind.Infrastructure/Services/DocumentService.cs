using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CodeMind.Domain.DTOs;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CodeMind.Infrastructure.Services;

public class DocumentService : IDocumentService
{
    private readonly IMinIOService _minIOService;
    private readonly IMessageProducer _kafkaProducer;
    private readonly AppDbContext _dbContext;

    public DocumentService(IMinIOService minIOService, IMessageProducer kafkaProducer, AppDbContext dbContext)
    {
        _minIOService = minIOService;
        _kafkaProducer = kafkaProducer;
        _dbContext = dbContext;
    }

    public async Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 1. MinIO'ya yükle
            string savedObjectName = await _minIOService.UploadFileAsync(fileStream, fileName, contentType);

            // 2. Veritabanına ilişkili sahte kayıtları (Foreign Key için) atıyoruz
            var tenant = await _dbContext.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync();
            if (tenant == null)
            {
                tenant = new Tenant { Id = Guid.NewGuid(), Name = "Test Şirketi" };
                _dbContext.Tenants.Add(tenant);
            }

            var project = await _dbContext.Projects.IgnoreQueryFilters().FirstOrDefaultAsync();
            if (project == null)
            {
                project = new Project { Id = Guid.NewGuid(), Name = "Test Projesi", TenantId = tenant.Id, Language = GetLanguageFromFileName(fileName) };
                _dbContext.Projects.Add(project);
            }

            var document = new Document 
            { 
                Id = Guid.NewGuid(), 
                ProjectId = project.Id, 
                FileName = fileName, 
                StorageUrl = savedObjectName,
                CreatedAt = DateTime.UtcNow
            };
            
            _dbContext.Documents.Add(document);
            await _dbContext.SaveChangesAsync();

            // 3. Kafka'ya mesaj gönder
            var eventMessage = new
            {
                FileId = document.Id,
                FileName = fileName,
                ObjectKey = savedObjectName
            };

            await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);

            // 4. Standart ApiResponse formatında dön
            var responseData = new { ObjectKey = savedObjectName, DocumentId = document.Id };
            return ApiResponse<object>.Success(responseData, "Dosya yüklendi ve analize gönderildi.");
        }
        catch (Exception ex)
        {
            return ApiResponse<object>.Fail(ex.Message, "Dosya yüklenirken veya kuyruğa atılırken bir hata oluştu.");
        }
    }

    public async Task<ApiResponse<List<DocumentHistoryDto>>> GetDocumentHistoryAsync()
    {
        try
        {
            var documents = await _dbContext.Documents
                .IgnoreQueryFilters()
                .Include(d => d.AnalysisReports)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            var historyList = documents.Select(d =>
            {
                var latestReport = d.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
                string severity = latestReport?.Severity ?? "Bekliyor";
                int score = CalculateScoreFromSeverity(severity);

                return new DocumentHistoryDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    Language = GetLanguageFromFileName(d.FileName),
                    CreatedAt = d.CreatedAt,
                    Status = d.Status.ToString(),
                    Severity = severity,
                    Score = score,
                    FindingsCount = d.AnalysisReports.Count,
                    LatestAiSuggestion = latestReport?.AiSuggestion
                };
            }).ToList();

            return ApiResponse<List<DocumentHistoryDto>>.Success(historyList, "Geçmiş başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            return ApiResponse<List<DocumentHistoryDto>>.Fail(ex.Message, "Geçmiş listesi alınırken hata oluştu.");
        }
    }

    public async Task<ApiResponse<DocumentReportDetailDto>> GetDocumentReportAsync(Guid id)
    {
        try
        {
            var document = await _dbContext.Documents
                .IgnoreQueryFilters()
                .Include(d => d.AnalysisReports)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (document == null)
            {
                return ApiResponse<DocumentReportDetailDto>.Fail("Doküman bulunamadı.");
            }

            var latestReport = document.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();

            var reportDetail = new DocumentReportDetailDto
            {
                DocumentId = document.Id,
                FileName = document.FileName,
                Language = GetLanguageFromFileName(document.FileName).ToLowerInvariant(),
                Status = document.Status.ToString(),
                CreatedAt = document.CreatedAt,
                Severity = latestReport?.Severity ?? "Medium",
                Score = CalculateScoreFromSeverity(latestReport?.Severity),
                AiSuggestion = latestReport?.AiSuggestion ?? "Henüz analiz tamamlanmadı.",
                OriginalCode = latestReport?.OriginalCode ?? "// Analiz edilen dosya: " + document.FileName,
                VulnerableLines = latestReport != null && latestReport.LineNumber > 0 
                    ? new List<int> { latestReport.LineNumber } 
                    : new List<int>()
            };

            return ApiResponse<DocumentReportDetailDto>.Success(reportDetail, "Rapor detayı başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            return ApiResponse<DocumentReportDetailDto>.Fail(ex.Message, "Rapor detayı alınırken hata oluştu.");
        }
    }

    public async Task<ApiResponse<DashboardStatsDto>> GetDashboardStatsAsync()
    {
        try
        {
            var documents = await _dbContext.Documents
                .IgnoreQueryFilters()
                .Include(d => d.AnalysisReports)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            var stats = new DashboardStatsDto
            {
                TotalDocuments = documents.Count,
                CriticalCount = documents.Count(d => d.AnalysisReports.Any(r => r.Severity.Contains("Kritik", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Critical", StringComparison.OrdinalIgnoreCase))),
                HighCount = documents.Count(d => d.AnalysisReports.Any(r => r.Severity.Contains("Yüksek", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("High", StringComparison.OrdinalIgnoreCase))),
                MediumCount = documents.Count(d => d.AnalysisReports.Any(r => r.Severity.Contains("Orta", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Medium", StringComparison.OrdinalIgnoreCase))),
                LowCount = documents.Count(d => d.AnalysisReports.Any(r => r.Severity.Contains("Düşük", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Low", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Güvenli", StringComparison.OrdinalIgnoreCase))),
            };

            var scores = documents.Select(d =>
            {
                var r = d.AnalysisReports.FirstOrDefault();
                return CalculateScoreFromSeverity(r?.Severity);
            }).ToList();

            stats.AverageScore = scores.Any() ? Math.Round(scores.Average(), 1) : 85.0;

            stats.RecentDocuments = documents.Take(5).Select(d =>
            {
                var r = d.AnalysisReports.FirstOrDefault();
                return new DocumentHistoryDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    Language = GetLanguageFromFileName(d.FileName),
                    CreatedAt = d.CreatedAt,
                    Status = d.Status.ToString(),
                    Severity = r?.Severity ?? "İşleniyor",
                    Score = CalculateScoreFromSeverity(r?.Severity),
                    FindingsCount = d.AnalysisReports.Count,
                    LatestAiSuggestion = r?.AiSuggestion
                };
            }).ToList();

            return ApiResponse<DashboardStatsDto>.Success(stats, "Dashboard istatistikleri başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            return ApiResponse<DashboardStatsDto>.Fail(ex.Message, "İstatistikler hesaplanırken hata oluştu.");
        }
    }

    private static string GetLanguageFromFileName(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".cs" => "C#",
            ".py" => "Python",
            ".js" => "JavaScript",
            ".ts" => "TypeScript",
            ".go" => "Go",
            ".java" => "Java",
            ".cpp" or ".c" => "C/C++",
            ".sql" => "SQL",
            _ => "Code"
        };
    }

    private static int CalculateScoreFromSeverity(string? severity)
    {
        if (string.IsNullOrEmpty(severity)) return 85;
        if (severity.Contains("Kritik", StringComparison.OrdinalIgnoreCase) || severity.Contains("Critical", StringComparison.OrdinalIgnoreCase)) return 45;
        if (severity.Contains("Yüksek", StringComparison.OrdinalIgnoreCase) || severity.Contains("High", StringComparison.OrdinalIgnoreCase)) return 65;
        if (severity.Contains("Orta", StringComparison.OrdinalIgnoreCase) || severity.Contains("Medium", StringComparison.OrdinalIgnoreCase)) return 80;
        if (severity.Contains("Düşük", StringComparison.OrdinalIgnoreCase) || severity.Contains("Low", StringComparison.OrdinalIgnoreCase)) return 92;
        return 96;
    }
}
