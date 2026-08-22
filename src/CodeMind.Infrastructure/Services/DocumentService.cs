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
    private readonly ICurrentUserService _currentUserService;

    public DocumentService(
        IMinIOService minIOService,
        IMessageProducer kafkaProducer,
        AppDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _minIOService = minIOService;
        _kafkaProducer = kafkaProducer;
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    public async Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 1. MinIO'ya yükle
            string savedObjectName = await _minIOService.UploadFileAsync(fileStream, fileName, contentType);

            // 2. Tenant & Project belirleme (Giriş yapılmışsa kullanıcının şirketi, değilse varsayılan)
            Guid tenantId = _currentUserService.TenantId;
            Tenant? tenant = null;

            if (tenantId != Guid.Empty)
            {
                tenant = await _dbContext.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
            }

            if (tenant == null)
            {
                tenant = await _dbContext.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync();
                if (tenant == null)
                {
                    tenant = new Tenant { Id = Guid.NewGuid(), Name = "Varsayılan Şirket" };
                    _dbContext.Tenants.Add(tenant);
                    await _dbContext.SaveChangesAsync();
                }
            }

            var project = await _dbContext.Projects.IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.TenantId == tenant.Id);

            if (project == null)
            {
                project = new Project 
                { 
                    Id = Guid.NewGuid(), 
                    Name = $"{tenant.Name} Repository", 
                    TenantId = tenant.Id, 
                    Language = GetLanguageFromFileName(fileName) 
                };
                _dbContext.Projects.Add(project);
                await _dbContext.SaveChangesAsync();
            }


            var document = new Document 
            { 
                Id = Guid.NewGuid(), 
                ProjectId = project.Id, 
                FileName = fileName, 
                StorageUrl = savedObjectName
            };
            
            _dbContext.Documents.Add(document);
            await _dbContext.SaveChangesAsync();

            // 3. Kafka'ya mesaj gönder
            var eventMessage = new
            {
                FileId = document.Id,
                FileName = fileName,
                ObjectKey = savedObjectName,
                UploadedByUserId = _currentUserService.UserId != Guid.Empty ? _currentUserService.UserId.ToString() : "Misafir / Anonim",
                TenantId = _currentUserService.TenantId != Guid.Empty ? _currentUserService.TenantId.ToString() : tenant.Id.ToString()
            };

            await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);
            Console.WriteLine($"[DocumentService] Dosya MinIO'ya yüklendi ve Kafka kuyruğuna atıldı. ID: {document.Id} | User ID: {eventMessage.UploadedByUserId}");


            // 4. Standart ApiResponse formatında dön
            var responseData = new { ObjectKey = savedObjectName, DocumentId = document.Id };
            return ApiResponse<object>.Success(responseData, "Dosya başarıyla yüklendi ve kuyruğa aktarıldı.");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[DocumentService Hata] {ex.Message} -> {ex.StackTrace}");
            return ApiResponse<object>.Fail(ex.Message, "Dosya yüklenirken veya kuyruğa atılırken bir hata oluştu.");
        }
    }

    public async Task<ApiResponse<List<DocumentHistoryDto>>> GetDocumentHistoryAsync()
    {
        try
        {
            var query = _dbContext.Documents.AsQueryable();
            if (_currentUserService.TenantId != Guid.Empty)
            {
                query = query.Where(d => d.Project.TenantId == _currentUserService.TenantId);
            }
            else
            {
                query = query.IgnoreQueryFilters();
            }

            var documents = await query
                .Include(d => d.AnalysisReports)
                .OrderByDescending(d => d.Id)
                .ToListAsync();

            var historyList = documents.Select(d =>
            {
                var latestReport = d.AnalysisReports.FirstOrDefault();
                string severity = latestReport?.Severity ?? "İnceleniyor";
                int score = CalculateScoreFromSeverity(severity);

                return new DocumentHistoryDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    Language = GetLanguageFromFileName(d.FileName),
                    CreatedAt = DateTime.UtcNow,
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
            var query = _dbContext.Documents.AsQueryable();
            if (_currentUserService.TenantId != Guid.Empty)
            {
                query = query.Where(d => d.Project.TenantId == _currentUserService.TenantId);
            }
            else
            {
                query = query.IgnoreQueryFilters();
            }

            var document = await query
                .Include(d => d.AnalysisReports)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (document == null)
            {
                return ApiResponse<DocumentReportDetailDto>.Fail("Doküman bulunamadı.");
            }

            var latestReport = document.AnalysisReports.FirstOrDefault();
            string originalFileContent = await _minIOService.GetFileTextAsync(document.StorageUrl);
            if (string.IsNullOrWhiteSpace(originalFileContent))
            {
                originalFileContent = latestReport?.OriginalCode ?? "// Analiz edilen dosya: " + document.FileName;
            }

            var reportDetail = new DocumentReportDetailDto
            {
                DocumentId = document.Id,
                FileName = document.FileName,
                Language = GetLanguageFromFileName(document.FileName).ToLowerInvariant(),
                Status = document.Status.ToString(),
                CreatedAt = DateTime.UtcNow,
                Severity = latestReport?.Severity ?? "Medium",
                Score = CalculateScoreFromSeverity(latestReport?.Severity),
                AiSuggestion = latestReport?.AiSuggestion ?? "Yapay zeka analiz çıktısı bekleniyor...",
                OriginalCode = originalFileContent,
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
            var query = _dbContext.Documents.AsQueryable();
            if (_currentUserService.TenantId != Guid.Empty)
            {
                query = query.Where(d => d.Project.TenantId == _currentUserService.TenantId);
            }
            else
            {
                query = query.IgnoreQueryFilters();
            }

            var documents = await query
                .Include(d => d.AnalysisReports)
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
                    CreatedAt = DateTime.UtcNow,
                    Status = d.Status.ToString(),
                    Severity = r?.Severity ?? "İnceleniyor",
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
