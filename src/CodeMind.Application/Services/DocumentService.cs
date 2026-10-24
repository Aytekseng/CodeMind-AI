using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Dashboard;
using CodeMind.Domain.DTOs.Document;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMind.Application.Services;

public class DocumentService : IDocumentService
{
    private static readonly HashSet<string> IgnoredDirectories = new(StringComparer.OrdinalIgnoreCase)
    {
        "node_modules", "bin", "obj", ".git", ".vs", ".idea", ".vscode", "dist", "build",
        ".next", "__pycache__", ".venv", "venv", "target", ".gradle", ".svn", ".hg",
        ".cache", ".turbo", "out", "coverage", ".nyc_output"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs", ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".java", ".cpp", ".c", ".h", ".hpp",
        ".rs", ".php", ".rb", ".swift", ".kt", ".scala", ".sql", ".html", ".css", ".scss",
        ".json", ".yaml", ".yml", ".xml", ".sh", ".ps1", ".bat", ".dockerfile", ".toml", ".md"
    };
    private readonly IMinIOService _minIOService;
    private readonly IMessageProducer _kafkaProducer;
    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITempKeyVaultService _tempKeyVaultService;
    private readonly ILogger<DocumentService> _logger;

    public DocumentService(
        IMinIOService minIOService,
        IMessageProducer kafkaProducer,
        IAppDbContext dbContext,
        ICurrentUserService currentUserService,
        ITempKeyVaultService tempKeyVaultService,
        ILogger<DocumentService> logger)
    {
        _minIOService = minIOService;
        _kafkaProducer = kafkaProducer;
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _tempKeyVaultService = tempKeyVaultService;
        _logger = logger;
    }

    private const int MaxFileBytes = 1024 * 1024;
    private static readonly HashSet<string> Models = new(StringComparer.OrdinalIgnoreCase)
        { "llama3", "qwen2.5-coder", "gemini-3.8-flash", "groq-llama3-70b", "gpt-6-sol", "claude-sonnet-5-5" };

    private void ValidateUpload(string? model, string? apiKey)
    {
        if (_currentUserService.TenantId == Guid.Empty || _currentUserService.UserId == Guid.Empty ||
            (_currentUserService.Role != "Admin" && _currentUserService.Role != "Developer"))
            throw new UnauthorizedAccessException("Kod yükleme yetkiniz yok.");
        if (!Models.Contains(model ?? "llama3")) throw new ArgumentException("Desteklenmeyen model.");
        if (model != null && !model.Equals("llama3", StringComparison.OrdinalIgnoreCase) && !model.StartsWith("qwen", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(apiKey))
            throw new ArgumentException("Bulut modeli için kendi API anahtarınızı girin.");
    }

    private async Task<(Project Project, List<Document> Documents)> QueueFilesAsync(
        List<(string Name, byte[] Content)> files, string projectName, string? model, string? apiKey)
    {
        model = (model ?? "llama3").Trim().ToLowerInvariant();
        ValidateUpload(model, apiKey);
        var project = new Project { Id = Guid.NewGuid(), Name = projectName,
            TenantId = _currentUserService.TenantId, Language = GetLanguageFromFileName(files[0].Name) };
        var documents = new List<Document>();
        var objects = new List<string>();
        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            // Serialize uploads with workspace deletion before writing any source objects.
            if (!await _dbContext.LockTenantAsync(_currentUserService.TenantId))
                throw new UnauthorizedAccessException("Çalışma alanı bulunamadı.");
            _dbContext.Projects.Add(project);
            foreach (var file in files)
            {
                using var stream = new MemoryStream(file.Content);
                var objectKey = await _minIOService.UploadFileAsync(stream, Path.GetFileName(file.Name), "text/plain");
                objects.Add(objectKey);
                var doc = new Document { Id = Guid.NewGuid(), ProjectId = project.Id, FileName = file.Name,
                    StorageUrl = objectKey, Model = model ?? "llama3", UploadedByUserId = _currentUserService.UserId,
                    RequiresApiKey = model != null && model != "llama3" && !model.StartsWith("qwen", StringComparison.OrdinalIgnoreCase) };
                documents.Add(doc);
                if (doc.RequiresApiKey) _tempKeyVaultService.StoreKey(doc.Id, apiKey!);
                _dbContext.Documents.Add(doc);
                _dbContext.OutboxMessages.Add(new OutboxMessage { Id = Guid.NewGuid(), DocumentId = doc.Id,
                    Payload = System.Text.Json.JsonSerializer.Serialize(new {
                        FileId = doc.Id, FileName = doc.FileName, ObjectKey = objectKey,
                        TenantId = project.TenantId, UploadedByUserId = doc.UploadedByUserId,
                        Model = doc.Model, RequiresApiKey = doc.RequiresApiKey }) });
            }
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return (project, documents);
        }
        catch
        {
            await transaction.RollbackAsync();
            foreach (var doc in documents) _tempKeyVaultService.RemoveKey(doc.Id);
            foreach (var key in objects)
            {
                try { await _minIOService.DeleteFileAsync(key); }
                catch (Exception ex) { _logger.LogError(ex, "Upload cleanup failed for {ObjectKey}", key); }
            }
            throw;
        }
    }

    private static async Task<byte[]> ReadSourceAsync(Stream stream)
    {
        using var buffer = new MemoryStream();
        var chunk = new byte[8192];
        int count;
        while ((count = await stream.ReadAsync(chunk)) > 0)
        {
            if (buffer.Length + count > MaxFileBytes)
                throw new ArgumentException("Açılmış kaynak dosya 1 MB sınırını aşıyor.");
            await buffer.WriteAsync(chunk.AsMemory(0, count));
        }
        return buffer.ToArray();
    }

    public async Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType, string? model = "llama3", string? apiKey = null)
    {
        ValidateUpload(model, apiKey);
        if (!AllowedExtensions.Contains(Path.GetExtension(fileName))) throw new ArgumentException("Desteklenmeyen dosya türü.");
        if (fileStream.Length == 0 || fileStream.Length > MaxFileBytes) throw new ArgumentException("Dosya boyutu 1 MB altında olmalıdır.");
        var content = await ReadSourceAsync(fileStream);
        var result = await QueueFilesAsync(new() { (Path.GetFileName(fileName), content) }, Path.GetFileNameWithoutExtension(fileName), model, apiKey);
        var doc = result.Documents[0];
        return ApiResponse<object>.Success(new { ObjectKey = doc.StorageUrl, DocumentId = doc.Id }, "Dosya analiz kuyruğuna alındı.");
    }

    public async Task<ApiResponse<ZipUploadResponseDto>> UploadAndQueueZipAsync(Stream zipStream, string archiveName, string? model = "llama3", string? apiKey = null)
    {
        ValidateUpload(model, apiKey);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
        var files = new List<(string Name, byte[] Content)>();
        long total = 0;
        foreach (var entry in archive.Entries)
        {
            var name = entry.FullName.Replace('\\', '/');
            if (string.IsNullOrEmpty(entry.Name) || name.Contains("..") || name.StartsWith('/') || name.Contains(':')) continue;
            if (name.Split('/').Any(IgnoredDirectories.Contains) || !AllowedExtensions.Contains(Path.GetExtension(name))) continue;
            if (entry.Length == 0) continue;
            if (entry.Length > MaxFileBytes || files.Count >= 100 || (total += entry.Length) > 20 * 1024 * 1024)
                throw new ArgumentException("Arşiv en fazla 100 dosya, dosya başına 1 MB ve toplam 20 MB açılmış kod içerebilir.");
            using var stream = entry.Open();
            var content = await ReadSourceAsync(stream);
            if (content.LongLength != entry.Length) throw new ArgumentException("Arşiv dosya boyutu geçersiz.");
            files.Add((name, content));
        }
        if (files.Count == 0) throw new ArgumentException("Arşivde desteklenen kaynak kod dosyası bulunamadı.");
        var result = await QueueFilesAsync(files, Path.GetFileNameWithoutExtension(archiveName), model, apiKey);
        return ApiResponse<ZipUploadResponseDto>.Success(new ZipUploadResponseDto {
            ProjectId = result.Project.Id, ProjectName = result.Project.Name, BatchId = result.Project.Id.ToString(),
            TotalExtractedFiles = files.Count, ExtractedFiles = files.Select(f => f.Name).ToList(),
            DocumentIds = result.Documents.Select(d => d.Id).ToList()
        }, "Proje analiz kuyruğuna alındı.");
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
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
            }

            var documents = await query
                .Include(d => d.Project)
                .Include(d => d.AnalysisReports)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            var historyList = documents.Select(d =>
            {
                var latestReport = d.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
                string severity;
                if (d.Status == DocumentStatus.Failed)
                {
                    severity = "Başarısız";
                }
                else if (d.Status == DocumentStatus.Cancelled)
                {
                    severity = "İptal Edildi";
                }
                else if (latestReport != null)
                {
                    severity = latestReport.Severity;
                }
                else
                {
                    severity = d.Status == DocumentStatus.Pending || d.Status == DocumentStatus.Processing 
                        ? "İnceleniyor" 
                        : d.Status.ToString();
                }

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
                    FindingsCount = d.AnalysisReports.Sum(r => r.FindingsCount),
                    LatestAiSuggestion = latestReport?.AiSuggestion ?? (d.Status == DocumentStatus.Failed ? "Analiz sırasında hata meydana geldi." : (d.Status == DocumentStatus.Cancelled ? "Analiz kullanıcı tarafından iptal edildi." : null)),
                    ProjectId = d.ProjectId,
                    ProjectName = d.Project?.Name,
                    ModelUsed = latestReport?.ModelUsed ?? FormatModelDisplayName(d.Model)
                };
            }).ToList();

            return ApiResponse<List<DocumentHistoryDto>>.Success(historyList, "Geçmiş başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document operation failed");
            return ApiResponse<List<DocumentHistoryDto>>.Fail("İşlem tamamlanamadı.", "Geçmiş listesi alınırken hata oluştu.");
        }
    }

    public async Task<ApiResponse<List<ProjectFileDto>>> GetProjectDocumentsAsync(Guid projectId)
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
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
            }

            var documents = await query
                .Where(d => d.ProjectId == projectId)
                .Include(d => d.AnalysisReports)
                .OrderBy(d => d.FileName)
                .ToListAsync();

            var files = documents.Select(d =>
            {
                var report = d.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
                string severity;
                if (d.Status == DocumentStatus.Failed)
                {
                    severity = "Başarısız";
                }
                else if (d.Status == DocumentStatus.Cancelled)
                {
                    severity = "İptal Edildi";
                }
                else if (report != null)
                {
                    severity = report.Severity;
                }
                else
                {
                    severity = d.Status == DocumentStatus.Pending || d.Status == DocumentStatus.Processing 
                        ? "İnceleniyor" 
                        : d.Status.ToString();
                }

                return new ProjectFileDto
                {
                    DocumentId = d.Id,
                    FileName = Path.GetFileName(d.FileName),
                    RelativePath = d.FileName,
                    Language = GetLanguageFromFileName(d.FileName),
                    Status = d.Status.ToString(),
                    Severity = severity,
                    Score = CalculateScoreFromSeverity(severity),
                    ModelUsed = report?.ModelUsed ?? FormatModelDisplayName(d.Model)
                };
            }).ToList();

            return ApiResponse<List<ProjectFileDto>>.Success(files, "Proje dosyaları başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document operation failed");
            return ApiResponse<List<ProjectFileDto>>.Fail("İşlem tamamlanamadı.", "Proje dosyaları alınırken hata oluştu.");
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
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
            }

            var document = await query
                .Include(d => d.Project)
                .Include(d => d.AnalysisReports)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (document == null)
            {
                return ApiResponse<DocumentReportDetailDto>.Fail("Doküman bulunamadı.");
            }

            var latestReport = document.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
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
                CreatedAt = document.CreatedAt,
                Severity = latestReport?.Severity ?? "İnceleniyor",
                Score = CalculateScoreFromSeverity(latestReport?.Severity),
                AiSuggestion = latestReport?.AiSuggestion ?? "Yapay zeka analiz çıktısı bekleniyor...",
                OriginalCode = originalFileContent,
                ProjectId = document.ProjectId,
                ProjectName = document.Project?.Name,
                ModelUsed = latestReport?.ModelUsed ?? FormatModelDisplayName(document.Model),
                VulnerableLines = FindingLines(latestReport)
            };

            return ApiResponse<DocumentReportDetailDto>.Success(reportDetail, "Rapor detayı başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document operation failed");
            return ApiResponse<DocumentReportDetailDto>.Fail("İşlem tamamlanamadı.", "Rapor detayı alınırken hata oluştu.");
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
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
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
                LowCount = documents.Count(d => d.AnalysisReports.Any(r => r.Severity.Contains("Düşük", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Low", StringComparison.OrdinalIgnoreCase) || (r.Severity.Contains("Güvenli", StringComparison.OrdinalIgnoreCase) || r.Severity == "Temiz"))),
            };

            var scores = documents.Where(d => d.Status == DocumentStatus.Completed && d.AnalysisReports.Any()).Select(d =>
            {
                var r = d.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
                return CalculateScoreFromSeverity(r?.Severity);
            }).ToList();

            stats.AverageScore = scores.Any() ? Math.Round(scores.Average(), 1) : null;

            stats.RecentDocuments = documents.OrderByDescending(d => d.CreatedAt).Take(5).Select(d =>
            {
                var r = d.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
                return new DocumentHistoryDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    Language = GetLanguageFromFileName(d.FileName),
                    CreatedAt = d.CreatedAt,
                    Status = d.Status.ToString(),
                    Severity = r?.Severity ?? "İnceleniyor",
                    Score = CalculateScoreFromSeverity(r?.Severity),
                    FindingsCount = d.AnalysisReports.Sum(r => r.FindingsCount),
                    LatestAiSuggestion = r?.AiSuggestion
                };
            }).ToList();

            return ApiResponse<DashboardStatsDto>.Success(stats, "Dashboard istatistikleri başarıyla getirildi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document operation failed");
            return ApiResponse<DashboardStatsDto>.Fail("İşlem tamamlanamadı.", "İstatistikler hesaplanırken hata oluştu.");
        }
    }

    public async Task<ApiResponse<DocumentExportReportDto>> ExportDocumentReportJsonAsync(Guid documentId)
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
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
            }

            var document = await query
                .Include(d => d.Project)
                    .ThenInclude(p => p.Tenant)
                .Include(d => d.AnalysisReports)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
            {
                return ApiResponse<DocumentExportReportDto>.Fail("Raporlanacak doküman bulunamadı veya erişim yetkiniz yok.");
            }

            var latestReport = document.AnalysisReports.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
            string originalFileContent = await _minIOService.GetFileTextAsync(document.StorageUrl);
            if (string.IsNullOrWhiteSpace(originalFileContent))
            {
                originalFileContent = latestReport?.OriginalCode ?? "// Analiz edilen dosya: " + document.FileName;
            }

            var companyName = document.Project?.Tenant?.Name ?? "CodeMind Security Workspace";

            var exportDto = new DocumentExportReportDto
            {
                Metadata = new ExportReportMetaDto
                {
                    ExportedAt = DateTime.UtcNow,
                    CompanyName = companyName,
                    ProjectName = document.Project?.Name,
                    System = "CodeMind-AI Automated Code Review",
                    Version = "1.0.0"
                },
                Document = new DocumentInfoExportDto
                {
                    DocumentId = document.Id,
                    FileName = document.FileName,
                    Language = GetLanguageFromFileName(document.FileName),
                    Status = document.Status.ToString(),
                    UploadedAt = document.CreatedAt,
                    OriginalCode = originalFileContent
                },
                Analysis = new AnalysisFindingExportDto
                {
                    Severity = latestReport?.Severity ?? "İnceleniyor",
                    Score = CalculateScoreFromSeverity(latestReport?.Severity),
                    ModelUsed = latestReport?.ModelUsed ?? FormatModelDisplayName(document.Model),
                    LineNumber = latestReport?.LineNumber ?? 0,
                    VulnerableLines = FindingLines(latestReport),
                    AiSuggestion = latestReport?.AiSuggestion ?? "Yapay zeka analiz raporu bulunamadı."
                }
            };

            return ApiResponse<DocumentExportReportDto>.Success(exportDto, "Doküman raporu başarıyla hazırlandı.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Doküman JSON raporu dışa aktarılırken hata oluştu. DocumentId: {DocumentId}", documentId);
            return ApiResponse<DocumentExportReportDto>.Fail("İşlem tamamlanamadı.", "Rapor dışa aktarılırken hata oluştu.");
        }
    }

    private static List<int> FindingLines(AnalysisReport? report)
    {
        if (report == null) return new();
        return (System.Text.Json.JsonSerializer.Deserialize<List<CodeMind.Domain.Events.SecurityFinding>>(report.FindingsJson) ?? new())
            .Select(f => f.LineNumber).Where(n => n > 0).Distinct().Order().ToList();
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

    public async Task<ApiResponse<bool>> CancelDocumentAnalysisAsync(Guid documentId)
    {
        try
        {
            if (_currentUserService.Role != "Admin" && _currentUserService.Role != "Developer")
                throw new UnauthorizedAccessException("Analiz iptal yetkiniz yok.");
            var query = _dbContext.Documents.AsQueryable();
            if (_currentUserService.TenantId != Guid.Empty)
            {
                query = query.Where(d => d.Project.TenantId == _currentUserService.TenantId);
            }
            else
            {
                throw new UnauthorizedAccessException("Geçerli şirket oturumu gerekli.");
            }

            var doc = await query.FirstOrDefaultAsync(d => d.Id == documentId);
            if (doc == null)
            {
                return ApiResponse<bool>.Fail("Doküman bulunamadı.", "Geçersiz doküman ID'si.");
            }

            if (doc.Status == DocumentStatus.Pending || doc.Status == DocumentStatus.Processing)
            {
                doc.Status = DocumentStatus.Cancelled;
                await _dbContext.SaveChangesAsync();
                _tempKeyVaultService.RemoveKey(doc.Id);
                _logger.LogInformation("Doküman analizi iptal edildi. DocumentId: {DocumentId}", documentId);
                return ApiResponse<bool>.Success(true, "Doküman analizi başarıyla iptal edildi.");
            }

            return ApiResponse<bool>.Success(false, "Doküman zaten tamamlanmış veya daha önce sonlandırılmış.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Doküman iptal edilirken hata oluştu. DocumentId: {DocumentId}", documentId);
            return ApiResponse<bool>.Fail("İşlem tamamlanamadı.", "İptal işlemi sırasında hata meydana geldi.");
        }
    }

    private static int CalculateScoreFromSeverity(string? severity)
    {
        if (string.IsNullOrEmpty(severity)) return 0;
        if (severity == "Temiz") return 100;
        if (severity == "İnceleniyor") return 0;
        if (severity.Contains("Başarısız", StringComparison.OrdinalIgnoreCase) || 
            severity.Contains("Failed", StringComparison.OrdinalIgnoreCase) ||
            severity.Contains("İptal", StringComparison.OrdinalIgnoreCase) ||
            severity.Contains("Cancel", StringComparison.OrdinalIgnoreCase)) return 0;
        if (severity.Contains("Kritik", StringComparison.OrdinalIgnoreCase) || severity.Contains("Critical", StringComparison.OrdinalIgnoreCase)) return 45;
        if (severity.Contains("Yüksek", StringComparison.OrdinalIgnoreCase) || severity.Contains("High", StringComparison.OrdinalIgnoreCase)) return 65;
        if (severity.Contains("Orta", StringComparison.OrdinalIgnoreCase) || severity.Contains("Medium", StringComparison.OrdinalIgnoreCase)) return 80;
        if (severity.Contains("Düşük", StringComparison.OrdinalIgnoreCase) || severity.Contains("Low", StringComparison.OrdinalIgnoreCase)) return 92;
        return 96;
    }

    private static string FormatModelDisplayName(string? model)
    {
        if (string.IsNullOrWhiteSpace(model)) return "Llama 3 (Yerel)";
        var m = model.Trim().ToLowerInvariant();
        if (m.Contains("llama") && m.Contains("groq")) return "Groq Llama 3.3 70B";
        if (m.Contains("llama")) return "Llama 3 (Yerel)";
        if (m.Contains("qwen")) return "Qwen 2.5 Coder 7B (Yerel)";
        if (m.Contains("gemini")) return "Google Gemini";
        if (m.Contains("gpt") || m.Contains("openai")) return "OpenAI GPT-6.1 Sol";
        if (m.Contains("claude") || m.Contains("anthropic")) return "Claude Sonnet 5.5";
        return model;
    }
}
