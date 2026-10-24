using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CodeMind.Domain.Constants;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Team;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMind.Application.Services;

public class TeamService : ITeamService
{
    private readonly IMinIOService _storage;
    private readonly ITempKeyVaultService _vault;
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<TeamService> _logger;

    public TeamService(IAppDbContext context, ICurrentUserService currentUserService, ILogger<TeamService> logger, IMinIOService storage, ITempKeyVaultService vault)
    {
        _context = context;
        _storage = storage;
        _vault = vault;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<ApiResponse<List<TeamMemberDto>>> GetTeamMembersAsync()
    {
        var tenantId = _currentUserService.TenantId;
        if (tenantId == Guid.Empty)
        {
            return ApiResponse<List<TeamMemberDto>>.Fail("Geçerli bir şirket/çalışma alanı oturumu bulunamadı.");
        }

        var members = await _context.Users
            .Where(u => u.TenantId == tenantId)
            .OrderBy(u => u.FirstName)
            .Select(u => new TeamMemberDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Role = u.Role
            })
            .ToListAsync();

        return ApiResponse<List<TeamMemberDto>>.Success(members, "Takım üyeleri başarıyla getirildi.");
    }

    public async Task<ApiResponse<TeamMemberDto>> CreateTeamMemberAsync(CreateTeamMemberRequestDto requestDto)
    {
        var tenantId = _currentUserService.TenantId;
        if (tenantId == Guid.Empty)
        {
            return ApiResponse<TeamMemberDto>.Fail("Geçerli bir şirket/çalışma alanı oturumu bulunamadı.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        if (!await _context.LockTenantAsync(tenantId) ||
            !await _context.Users.AsNoTracking().AnyAsync(u => u.Id == _currentUserService.UserId && u.TenantId == tenantId && u.Role == Roles.Admin))
            return ApiResponse<TeamMemberDto>.Fail("Güncel yönetici oturumu ve şirket kaydı gerekli.");

        // 1. Temel Doğrulamalar
        if (string.IsNullOrWhiteSpace(requestDto.FirstName) || string.IsNullOrWhiteSpace(requestDto.LastName))
        {
            return ApiResponse<TeamMemberDto>.Fail("Üyenin adı ve soyadı boş bırakılamaz.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.Email) || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(requestDto.Email.Trim()))
        {
            return ApiResponse<TeamMemberDto>.Fail("Lütfen geçerli bir e-posta adresi girin.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.TemporaryPassword) || requestDto.TemporaryPassword.Length < 12 || System.Text.Encoding.UTF8.GetByteCount(requestDto.TemporaryPassword) > 72)
        {
            return ApiResponse<TeamMemberDto>.Fail("Geçici şifre en az 12 karakter (en fazla 72 bayt) uzunluğunda olmalıdır.");
        }

        // 2. Rol Doğrulaması
        var targetRole = Roles.All.FirstOrDefault(r => string.Equals(r, requestDto.Role, StringComparison.OrdinalIgnoreCase));
        if (string.IsNullOrEmpty(targetRole))
        {
            targetRole = Roles.Developer;
        }

        // 3. E-Posta Benzersizlik Kontrolü (Tüm sistemde)
        var normalizedEmail = requestDto.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail);

        if (emailExists)
        {
            return ApiResponse<TeamMemberDto>.Fail("Bu e-posta adresi sistemde zaten kayıtlı.");
        }

        // 4. Yeni Kullanıcı Oluşturma
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FirstName = requestDto.FirstName.Trim(),
            LastName = requestDto.LastName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = requestDto.PhoneNumber?.Trim() ?? string.Empty,
            Role = targetRole,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(requestDto.TemporaryPassword),
            MustChangePassword = true
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation("Yeni takım üyesi eklendi. UserId: {UserId}, Email: {Email}, Role: {Role}, TenantId: {TenantId}",
            newUser.Id, newUser.Email, newUser.Role, tenantId);

        var memberDto = new TeamMemberDto
        {
            Id = newUser.Id,
            FirstName = newUser.FirstName,
            LastName = newUser.LastName,
            Email = newUser.Email,
            PhoneNumber = newUser.PhoneNumber,
            Role = newUser.Role
        };

        return ApiResponse<TeamMemberDto>.Success(memberDto, "Yeni takım arkadaşınız başarıyla eklendi.");
    }

    public async Task<ApiResponse<TeamMemberDto>> UpdateMemberRoleAsync(Guid memberId, UpdateTeamMemberRoleRequestDto requestDto)
    {
        var tenantId = _currentUserService.TenantId;
        if (tenantId == Guid.Empty)
        {
            return ApiResponse<TeamMemberDto>.Fail("Geçerli bir şirket oturumu bulunamadı.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        if (!await _context.LockTenantAsync(tenantId) ||
            !await _context.Users.AsNoTracking().AnyAsync(u => u.Id == _currentUserService.UserId && u.TenantId == tenantId && u.Role == Roles.Admin))
            return ApiResponse<TeamMemberDto>.Fail("Güncel yönetici oturumu ve şirket kaydı gerekli.");

        var targetRole = Roles.All.FirstOrDefault(r => string.Equals(r, requestDto.Role, StringComparison.OrdinalIgnoreCase));
        if (string.IsNullOrEmpty(targetRole))
        {
            return ApiResponse<TeamMemberDto>.Fail("Geçersiz rol seçimi.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == memberId && u.TenantId == tenantId);
        if (user == null)
        {
            return ApiResponse<TeamMemberDto>.Fail("Kullanıcı bulunamadı.");
        }

        // Eğer mevcut rol Admin ise ve rol düşürülüyorsa: Son admin kontrolü yap
        if (user.Role == Roles.Admin && targetRole != Roles.Admin)
        {
            var adminCount = await _context.Users.CountAsync(u => u.TenantId == tenantId && u.Role == Roles.Admin);
            if (adminCount <= 1)
            {
                return ApiResponse<TeamMemberDto>.Fail("Şirkette en az 1 Yönetici (Admin) bulunmalıdır. Son yöneticinin rolü değiştirilemez.");
            }
        }

        user.Role = targetRole;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation("Kullanıcı rolü güncellendi. UserId: {UserId}, Yeni Rol: {Role}", user.Id, user.Role);

        var memberDto = new TeamMemberDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role
        };

        return ApiResponse<TeamMemberDto>.Success(memberDto, "Kullanıcı rolü başarıyla güncellendi.");
    }

    public async Task<ApiResponse<string>> RemoveTeamMemberAsync(Guid memberId)
    {
        var tenantId = _currentUserService.TenantId;
        var currentUserId = _currentUserService.UserId;

        if (tenantId == Guid.Empty)
        {
            return ApiResponse<string>.Fail("Geçerli bir şirket oturumu bulunamadı.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        if (!await _context.LockTenantAsync(tenantId) ||
            !await _context.Users.AsNoTracking().AnyAsync(u => u.Id == _currentUserService.UserId && u.TenantId == tenantId && u.Role == Roles.Admin))
            return ApiResponse<string>.Fail("Güncel yönetici oturumu ve şirket kaydı gerekli.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == memberId && u.TenantId == tenantId);
        if (user == null)
        {
            return ApiResponse<string>.Fail("Silinmek istenen kullanıcı bulunamadı.");
        }

        // Son Admin kontrolü
        if (user.Role == Roles.Admin)
        {
            var adminCount = await _context.Users.CountAsync(u => u.TenantId == tenantId && u.Role == Roles.Admin);
            if (adminCount <= 1)
            {
                return ApiResponse<string>.Fail("Şirkette en az 1 Yönetici (Admin) bulunmalıdır. Son yönetici silinemez.");
            }
        }

        // Şirketten çıkarılan kullanıcının hesabı tamamen silinir (Zombi hesap kalmaz)
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation("Takım üyesinin hesabı silindi. UserId: {UserId}, Email: {Email}, TenantId: {TenantId}",
            user.Id, user.Email, tenantId);

        return ApiResponse<string>.Success(user.Email, "Kullanıcının şirketle ilişiği kesildi ve hesabı başarıyla silindi.");
    }

    public async Task<ApiResponse<string>> DeleteCompanyWorkspaceAsync(DeleteCompanyRequestDto requestDto)
    {
        var tenantId = _currentUserService.TenantId;
        var currentUserId = _currentUserService.UserId;

        if (tenantId == Guid.Empty || currentUserId == Guid.Empty)
        {
            return ApiResponse<string>.Fail("Geçerli bir oturum bulunamadı.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        if (!await _context.LockTenantAsync(tenantId) ||
            !await _context.Users.AsNoTracking().AnyAsync(u => u.Id == _currentUserService.UserId && u.TenantId == tenantId && u.Role == Roles.Admin))
            return ApiResponse<string>.Fail("Güncel yönetici oturumu ve şirket kaydı gerekli.");

        // 1. İşlemi yapan Admin kullanıcısını doğrula
        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId && u.TenantId == tenantId);
        if (adminUser == null || adminUser.Role != Roles.Admin)
        {
            return ApiResponse<string>.Fail("Bu kritik işlemi gerçekleştirmek için şirket Yöneticisi (Admin) olmalısınız.");
        }

        // 2. Şifre Doğrulaması
        if (string.IsNullOrWhiteSpace(requestDto.Password) || !BCrypt.Net.BCrypt.Verify(requestDto.Password, adminUser.PasswordHash))
        {
            return ApiResponse<string>.Fail("Mevcut şifrenizi hatalı girdiniz. Güvenlik gerekçesiyle işlem iptal edildi.");
        }

        // 3. Şirket (Tenant) varlığını ve onay adını kontrol et
        var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return ApiResponse<string>.Fail("Şirket kaydı bulunamadı.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.ConfirmationCompanyName) || 
            !string.Equals(requestDto.ConfirmationCompanyName.Trim(), tenant.Name.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<string>.Fail($"Onaylamak için şirket adını tam olarak yazmalısınız (Beklenen: \"{tenant.Name}\").");
        }

        // 4. Şirkete ait tüm verileri transaction ile cascade olarak imha et
        try
        {
            // a) Analysis Reports
            var reports = await _context.AnalysisReports
                .IgnoreQueryFilters()
                .Where(a => a.Document.Project.TenantId == tenantId)
                .ToListAsync();
            if (reports.Any())
            {
                _context.AnalysisReports.RemoveRange(reports);
            }

            // b) Documents
            var documents = await _context.Documents
                .IgnoreQueryFilters()
                .Where(d => d.Project.TenantId == tenantId)
                .ToListAsync();
            if (documents.Any())
            {
                // Remove source objects and legacy embeddings before reporting successful erasure.
                foreach (var document in documents)
                {
                    await _storage.DeleteFileAsync(document.StorageUrl);
                    _vault.RemoveKey(document.Id);
                }
                await _context.DeleteLegacyEmbeddingsAsync(documents.Select(d => d.Id).ToArray());
                _context.Documents.RemoveRange(documents);
            }

            // c) Projects
            var projects = await _context.Projects
                .IgnoreQueryFilters()
                .Where(p => p.TenantId == tenantId)
                .ToListAsync();
            if (projects.Any())
            {
                _context.Projects.RemoveRange(projects);
            }

            // d) All Users in Tenant
            var users = await _context.Users
                .IgnoreQueryFilters()
                .Where(u => u.TenantId == tenantId)
                .ToListAsync();
            if (users.Any())
            {
                _context.Users.RemoveRange(users);
            }

            // e) Tenant itself
            _context.Tenants.Remove(tenant);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogWarning("ŞİRKET ÇALIŞMA ALANI VE TÜM VERİLERİ KALICI OLARAK İMHA EDİLDİ! TenantId: {TenantId}, CompanyName: {CompanyName}, ExecutedBy: {AdminEmail}",
                tenantId, tenant.Name, adminUser.Email);

            return ApiResponse<string>.Success(tenant.Name, $"\"{tenant.Name}\" çalışma alanı, projeleri ve tüm kullanıcı hesapları başarıyla silindi.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Şirket silme işlemi sırasında hata oluştu. TenantId: {TenantId}", tenantId);
            return ApiResponse<string>.Fail("Şirket silme tamamlanamadı. Depolama temizliği için işlemi tekrar deneyin.");
        }
    }

    public async Task<ApiResponse<CompanyExportDto>> ExportCompanyDataAsync()
    {
        var tenantId = _currentUserService.TenantId;
        var currentUserId = _currentUserService.UserId;

        if (tenantId == Guid.Empty)
        {
            return ApiResponse<CompanyExportDto>.Fail("Geçerli bir şirket/çalışma alanı oturumu bulunamadı.");
        }

        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId && u.TenantId == tenantId);
        if (adminUser == null || adminUser.Role != Roles.Admin)
        {
            return ApiResponse<CompanyExportDto>.Fail("Şirket verilerini dışa aktarma yetkisi yalnızca Yöneticilere (Admin) aittir.");
        }

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return ApiResponse<CompanyExportDto>.Fail("Şirket kaydı bulunamadı.");
        }

        var users = await _context.Users
            .Where(u => u.TenantId == tenantId)
            .OrderBy(u => u.FirstName)
            .Select(u => new CompanyUserExportDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Role = u.Role
            })
            .ToListAsync();

        var projects = await _context.Projects
            .Where(p => p.TenantId == tenantId)
            .Include(p => p.Documents)
                .ThenInclude(d => d.AnalysisReports)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var allDocuments = projects.SelectMany(p => p.Documents).ToList();
        var allReports = allDocuments.SelectMany(d => d.AnalysisReports).ToList();

        var exportDto = new CompanyExportDto
        {
            ExportMetadata = new ExportMetadataDto
            {
                ExportedAt = DateTime.UtcNow,
                ExportedBy = $"{adminUser.FirstName} {adminUser.LastName} ({adminUser.Email})"
            },
            Company = new CompanyInfoDto
            {
                Id = tenant.Id,
                Name = tenant.Name,
                SubscriptionTier = tenant.SubscriptionTier.ToString()
            },
            Users = users,
            Projects = projects.Select(p => new ProjectExportDto
            {
                Id = p.Id,
                Name = p.Name,
                Language = p.Language,
                Documents = p.Documents.Select(d => new DocumentExportDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    StorageUrl = d.StorageUrl,
                    Status = d.Status.ToString(),
                    AnalysisReports = d.AnalysisReports.Select(r => new AnalysisReportExportDto
                    {
                        Id = r.Id,
                        Severity = r.Severity,
                        LineNumber = r.LineNumber,
                        AiSuggestion = r.AiSuggestion,
                        ModelUsed = r.ModelUsed ?? "Llama 3"
                    }).ToList()
                }).ToList()
            }).ToList(),
            Statistics = new CompanyExportStatsDto
            {
                TotalProjects = projects.Count,
                TotalDocuments = allDocuments.Count,
                TotalReports = allReports.Count,
                CriticalCount = allReports.Count(r => r.Severity.Contains("Kritik", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Critical", StringComparison.OrdinalIgnoreCase)),
                HighCount = allReports.Count(r => r.Severity.Contains("Yüksek", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("High", StringComparison.OrdinalIgnoreCase)),
                MediumCount = allReports.Count(r => r.Severity.Contains("Orta", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Medium", StringComparison.OrdinalIgnoreCase)),
                LowCount = allReports.Count(r => r.Severity.Contains("Düşük", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Low", StringComparison.OrdinalIgnoreCase) || r.Severity.Contains("Güvenli", StringComparison.OrdinalIgnoreCase))
            }
        };

        _logger.LogInformation("Şirket verileri dışa aktarıldı. TenantId: {TenantId}, Company: {Company}, ExecutedBy: {AdminEmail}",
            tenantId, tenant.Name, adminUser.Email);

        return ApiResponse<CompanyExportDto>.Success(exportDto, "Şirket verileri başarıyla hazırlandı.");
    }
}

