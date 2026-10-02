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

    public async Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType, string? model = "llama3", string? apiKey = null)
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
                StorageUrl = savedObjectName,
                Model = string.IsNullOrWhiteSpace(model) ? "llama3" : model
            };
            
            _dbContext.Documents.Add(document);
            await _dbContext.SaveChangesAsync();

            // 3. Ephemeral In-Memory Token Vault: Yalnızca bulut modeller için bilet üretilir, yerel modellerde (llama3, qwen) anahtar aranmaz
            var isLocalModel = string.Equals(model, "llama3", StringComparison.OrdinalIgnoreCase) 
                || (model != null && model.StartsWith("qwen", StringComparison.OrdinalIgnoreCase));
            string? keyToken = !string.IsNullOrWhiteSpace(apiKey) && !isLocalModel
                ? _tempKeyVaultService.StoreKey(apiKey)
                : null;

            // Kafka'ya mesaj gönder
            var eventMessage = new
            {
                FileId = document.Id,
                FileName = fileName,
                ObjectKey = savedObjectName,
                UploadedByUserId = _currentUserService.UserId != Guid.Empty ? _currentUserService.UserId.ToString() : "Misafir / Anonim",
                TenantId = _currentUserService.TenantId != Guid.Empty ? _currentUserService.TenantId.ToString() : tenant.Id.ToString(),
                Model = string.IsNullOrWhiteSpace(model) ? "llama3" : model,
                KeyToken = keyToken
            };

            await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);
            _logger.LogInformation("Dosya MinIO'ya yüklendi ve Kafka kuyruğuna aktarıldı (Ephemeral Token: {HasToken}). DocumentId: {DocumentId}, FileName: {FileName}, Model: {Model}", 
                keyToken != null, document.Id, fileName, eventMessage.Model);

            // 4. Standart ApiResponse formatında dön
            var responseData = new { ObjectKey = savedObjectName, DocumentId = document.Id };
            return ApiResponse<object>.Success(responseData, "Dosya başarıyla yüklendi ve kuyruğa aktarıldı.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dosya yüklenirken veya kuyruğa atılırken hata oluştu. FileName: {FileName}", fileName);
            return ApiResponse<object>.Fail(ex.Message, "Dosya yüklenirken veya kuyruğa atılırken bir hata oluştu.");
        }
    }

    public async Task<ApiResponse<ZipUploadResponseDto>> UploadAndQueueZipAsync(Stream zipStream, string archiveName, string? model = "llama3", string? apiKey = null)
    {
        try
        {
            // 1. Tenant belirleme
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

            // 2. Zip arşivi stream üzerinden açılır
            using var zipArchive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: false);

            // 3. Güvenlik ve filtreleme denetimi (Zip-Slip ve gürültü filtreleme)
            var validEntries = new List<ZipArchiveEntry>();
            foreach (var entry in zipArchive.Entries)
            {
                // Dizinleri atla
                if (string.IsNullOrEmpty(entry.Name)) continue;

                // Zip-Slip (Path traversal) kontrolü
                if (entry.FullName.Contains("..") || entry.FullName.StartsWith('/') || entry.FullName.StartsWith('\\'))
                    continue;

                // Gürültülü dizinleri atla
                var pathSegments = entry.FullName.Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
                if (pathSegments.Any(segment => IgnoredDirectories.Contains(segment)))
                    continue;

                // Uzantı kontrolü
                var ext = Path.GetExtension(entry.Name);
                if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
                    continue;

                // Boyut kontrolü (Boş veya tekil 10MB üstü dosyalar atlanır)
                if (entry.Length == 0 || entry.Length > 10 * 1024 * 1024)
                    continue;

                validEntries.Add(entry);
                if (validEntries.Count >= 300) break; // Güvenlik üst limiti (Maks 300 dosya)
            }

            if (validEntries.Count == 0)
            {
                return ApiResponse<ZipUploadResponseDto>.Fail(
                    "Arşiv içerisinde analiz edilebilecek geçerli kaynak kod dosyası bulunamadı. " +
                    "(Desteklenen formatlar: .cs, .py, .js, .ts, .go, .java vb.)"
                );
            }

            // 4. Proje adını arşiv adından türet ve yeni Proje oluştur
            string projectName = Path.GetFileNameWithoutExtension(archiveName);
            if (string.IsNullOrWhiteSpace(projectName)) projectName = "Kod Deposu";

            var mostCommonExt = validEntries
                .Select(e => Path.GetExtension(e.Name))
                .GroupBy(e => e)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.Key ?? ".cs";
            string primaryLanguage = GetLanguageFromFileName("file" + mostCommonExt);

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = projectName,
                TenantId = tenant.Id,
                Language = primaryLanguage
            };
            _dbContext.Projects.Add(project);
            await _dbContext.SaveChangesAsync();

            // 5. Dosyaları MinIO'ya yükle, DB'ye Document olarak ekle ve Kafka'ya fırlat
            var batchId = Guid.NewGuid().ToString();
            var extractedNames = new List<string>();
            var documentIds = new List<Guid>();

            // Ephemeral In-Memory Token Vault: Yalnızca bulut modeller için tek bir bilet üretilir (5 dk TTL)
            var isLocalZipModel = string.Equals(model, "llama3", StringComparison.OrdinalIgnoreCase) 
                || (model != null && model.StartsWith("qwen", StringComparison.OrdinalIgnoreCase));
            string? zipKeyToken = !string.IsNullOrWhiteSpace(apiKey) && !isLocalZipModel
                ? _tempKeyVaultService.StoreKey(apiKey, TimeSpan.FromMinutes(5))
                : null;

            for (int i = 0; i < validEntries.Count; i++)
            {
                var entry = validEntries[i];
                var normalizedPath = entry.FullName.Replace('\\', '/');

                using var entryStream = entry.Open();
                using var ms = new MemoryStream();
                await entryStream.CopyToAsync(ms);
                ms.Position = 0;

                string savedObjectName = await _minIOService.UploadFileAsync(ms, entry.Name, "text/plain");

                var document = new Document
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    FileName = normalizedPath,
                    StorageUrl = savedObjectName,
                    Status = DocumentStatus.Pending,
                    Model = string.IsNullOrWhiteSpace(model) ? "llama3" : model
                };

                _dbContext.Documents.Add(document);
                extractedNames.Add(normalizedPath);
                documentIds.Add(document.Id);

                var eventMessage = new
                {
                    FileId = document.Id,
                    FileName = normalizedPath,
                    ObjectKey = savedObjectName,
                    UploadedByUserId = _currentUserService.UserId != Guid.Empty ? _currentUserService.UserId.ToString() : "Misafir / Anonim",
                    TenantId = tenant.Id.ToString(),
                    BatchId = batchId,
                    BatchTotal = validEntries.Count,
                    BatchIndex = i + 1,
                    ProjectId = project.Id.ToString(),
                    Model = string.IsNullOrWhiteSpace(model) ? "llama3" : model,
                    KeyToken = zipKeyToken
                };

                await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);
            }

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("{Count} adet kod dosyası içeren '{ProjectName}' arşivi MinIO'ya ve Kafka kuyruğuna aktarıldı. BatchId: {BatchId}, ProjectId: {ProjectId}", 
                validEntries.Count, projectName, batchId, project.Id);

            var responseDto = new ZipUploadResponseDto
            {
                ProjectId = project.Id,
                ProjectName = project.Name,
                BatchId = batchId,
                TotalExtractedFiles = validEntries.Count,
                ExtractedFiles = extractedNames,
                DocumentIds = documentIds
            };

            return ApiResponse<ZipUploadResponseDto>.Success(
                responseDto, 
                $"{validEntries.Count} adet geçerli kod dosyası başarıyla ayıklandı ve analiz kuyruğuna aktarıldı."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ZIP arşivi işlenirken veya kuyruğa aktarılırken hata oluştu. ArchiveName: {ArchiveName}", archiveName);
            return ApiResponse<ZipUploadResponseDto>.Fail(ex.Message, "Arşiv işlenirken veya kuyruğa aktarılırken bir hata oluştu.");
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
                .Include(d => d.Project)
                .Include(d => d.AnalysisReports)
                .OrderByDescending(d => d.Id)
                .ToListAsync();

            var historyList = documents.Select(d =>
            {
                var latestReport = d.AnalysisReports.FirstOrDefault();
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
                    CreatedAt = DateTime.UtcNow,
                    Status = d.Status.ToString(),
                    Severity = severity,
                    Score = score,
                    FindingsCount = d.AnalysisReports.Count,
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
            return ApiResponse<List<DocumentHistoryDto>>.Fail(ex.Message, "Geçmiş listesi alınırken hata oluştu.");
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
                query = query.IgnoreQueryFilters();
            }

            var documents = await query
                .Where(d => d.ProjectId == projectId)
                .Include(d => d.AnalysisReports)
                .OrderBy(d => d.FileName)
                .ToListAsync();

            var files = documents.Select(d =>
            {
                var report = d.AnalysisReports.FirstOrDefault();
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
            return ApiResponse<List<ProjectFileDto>>.Fail(ex.Message, "Proje dosyaları alınırken hata oluştu.");
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
                .Include(d => d.Project)
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
                ProjectId = document.ProjectId,
                ProjectName = document.Project?.Name,
                ModelUsed = latestReport?.ModelUsed ?? FormatModelDisplayName(document.Model),
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
                query = query.IgnoreQueryFilters();
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

            var latestReport = document.AnalysisReports.FirstOrDefault();
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
                    UploadedAt = DateTime.UtcNow,
                    OriginalCode = originalFileContent
                },
                Analysis = new AnalysisFindingExportDto
                {
                    Severity = latestReport?.Severity ?? "İnceleniyor",
                    Score = CalculateScoreFromSeverity(latestReport?.Severity),
                    ModelUsed = latestReport?.ModelUsed ?? FormatModelDisplayName(document.Model),
                    LineNumber = latestReport?.LineNumber ?? 0,
                    VulnerableLines = latestReport != null && latestReport.LineNumber > 0
                        ? new List<int> { latestReport.LineNumber }
                        : new List<int>(),
                    AiSuggestion = latestReport?.AiSuggestion ?? "Yapay zeka analiz raporu bulunamadı."
                }
            };

            return ApiResponse<DocumentExportReportDto>.Success(exportDto, "Doküman raporu başarıyla hazırlandı.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Doküman JSON raporu dışa aktarılırken hata oluştu. DocumentId: {DocumentId}", documentId);
            return ApiResponse<DocumentExportReportDto>.Fail(ex.Message, "Rapor dışa aktarılırken hata oluştu.");
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

    public async Task<ApiResponse<bool>> CancelDocumentAnalysisAsync(Guid documentId)
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

            var doc = await query.FirstOrDefaultAsync(d => d.Id == documentId);
            if (doc == null)
            {
                return ApiResponse<bool>.Fail("Doküman bulunamadı.", "Geçersiz doküman ID'si.");
            }

            if (doc.Status == DocumentStatus.Pending || doc.Status == DocumentStatus.Processing)
            {
                doc.Status = DocumentStatus.Cancelled;
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Doküman analizi iptal edildi. DocumentId: {DocumentId}", documentId);
                return ApiResponse<bool>.Success(true, "Doküman analizi başarıyla iptal edildi.");
            }

            return ApiResponse<bool>.Success(false, "Doküman zaten tamamlanmış veya daha önce sonlandırılmış.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Doküman iptal edilirken hata oluştu. DocumentId: {DocumentId}", documentId);
            return ApiResponse<bool>.Fail(ex.Message, "İptal işlemi sırasında hata meydana geldi.");
        }
    }

    private static int CalculateScoreFromSeverity(string? severity)
    {
        if (string.IsNullOrEmpty(severity)) return 85;
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
        if (m.Contains("gpt") || m.Contains("openai")) return "OpenAI GPT-4o";
        if (m.Contains("claude") || m.Contains("anthropic")) return "Claude 3.5 Sonnet";
        return model;
    }
}
