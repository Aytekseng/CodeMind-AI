using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CodeMind.Domain.Constants;
using CodeMind.Domain.DTOs;
using CodeMind.Domain.DTOs.Team;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeMind.Infrastructure.Services;

public class TeamService : ITeamService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<TeamService> _logger;

    public TeamService(AppDbContext context, ICurrentUserService currentUserService, ILogger<TeamService> logger)
    {
        _context = context;
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

        // 1. Temel Doğrulamalar
        if (string.IsNullOrWhiteSpace(requestDto.FirstName) || string.IsNullOrWhiteSpace(requestDto.LastName))
        {
            return ApiResponse<TeamMemberDto>.Fail("Üyenin adı ve soyadı boş bırakılamaz.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.Email) || !requestDto.Email.Contains('@'))
        {
            return ApiResponse<TeamMemberDto>.Fail("Lütfen geçerli bir e-posta adresi girin.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.TemporaryPassword) || requestDto.TemporaryPassword.Length < 6)
        {
            return ApiResponse<TeamMemberDto>.Fail("Geçici şifre en az 6 karakter uzunluğunda olmalıdır.");
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
        await _context.SaveChangesAsync();

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
        using var transaction = await _context.Database.BeginTransactionAsync();
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
            return ApiResponse<string>.Fail("Şirket silinirken beklenmeyen bir hata oluştu: " + ex.Message);
        }
    }
}

