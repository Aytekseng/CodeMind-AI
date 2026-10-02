using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.DTOs.Auth.Responses;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CodeMind.Application.Services;

public class AuthService : IAuthService
{
    private readonly IAppDbContext _context;
    private readonly IConfiguration _config;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUserService;

    public AuthService(IAppDbContext context, IConfiguration config, IMapper mapper, ICurrentUserService currentUserService)
    {
        _context = context;
        _config = config;
        _mapper = mapper;
        _currentUserService = currentUserService;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto requestDto)
    {
        // 1. E-posta kontrolü (Filtreleri yoksayarak tüm veritabanında arıyoruz)
        var userExists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == requestDto.Email);
        if (userExists)
            return ApiResponse<AuthResponseDto>.Fail("Bu e-posta adresi zaten kullanımda.");

        // 2. Yeni Şirket (Tenant) oluştur (AutoMapper ile)
        var newTenant = _mapper.Map<Tenant>(requestDto);
        if (string.IsNullOrWhiteSpace(newTenant.Name))
        {
            newTenant.Name = $"{requestDto.FirstName} {requestDto.LastName} Workspace".Trim();
        }
        _context.Tenants.Add(newTenant);
        await _context.SaveChangesAsync();

        // 3. Şifre Hashleme ve Yeni Kullanıcı (User) oluştur (AutoMapper ile)
        var newUser = _mapper.Map<User>(requestDto);
        newUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(requestDto.Password);
        newUser.Role = "Admin";
        newUser.TenantId = newTenant.Id;

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // 4. Token üret ve dön
        var token = GenerateJwtToken(newUser);
        var responseDto = new AuthResponseDto
        {
            Token = token,
            Email = newUser.Email,
            FirstName = newUser.FirstName,
            LastName = newUser.LastName,
            Role = newUser.Role,
            TenantName = newTenant.Name,
            UserId = newUser.Id,
            TenantId = newUser.TenantId,
            MustChangePassword = false
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Kayıt işlemi başarıyla tamamlandı.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto requestDto)
    {
        // 1. Kullanıcıyı ve Şirketini bul (Giriş anında henüz oturum açılmadığı için QueryFilter'ı yoksaymalıyız!)
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Email == requestDto.Email);

        if (user == null)
            return ApiResponse<AuthResponseDto>.Fail("E-posta adresi veya şifre hatalı.");

        // 2. Şifreyi doğrula
        bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(requestDto.Password, user.PasswordHash);
        if (!isPasswordCorrect)
            return ApiResponse<AuthResponseDto>.Fail("E-posta adresi veya şifre hatalı.");

        // 3. Token üret ve dön
        var token = GenerateJwtToken(user);
        var responseDto = new AuthResponseDto
        {
            Token = token,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            TenantName = user.Tenant?.Name ?? "Şirket",
            UserId = user.Id,
            TenantId = user.TenantId,
            MustChangePassword = user.MustChangePassword
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Giriş başarılı.");
    }

    public async Task<ApiResponse<AuthResponseDto>> GetCurrentUserProfileAsync()
    {
        var currentUserId = _currentUserService.UserId;
        if (currentUserId == Guid.Empty)
        {
            return ApiResponse<AuthResponseDto>.Fail("Geçerli bir kullanıcı oturumu bulunamadı.");
        }

        var user = await _context.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == currentUserId);

        if (user == null)
        {
            return ApiResponse<AuthResponseDto>.Fail("Kullanıcı profili bulunamadı.");
        }

        var responseDto = new AuthResponseDto
        {
            Token = string.Empty, // Profil sorgusunda yeni token üretmeye gerek yok
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            TenantName = user.Tenant?.Name ?? "Şirket",
            UserId = user.Id,
            TenantId = user.TenantId,
            MustChangePassword = user.MustChangePassword
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Profil bilgisi başarıyla getirildi.");
    }

    public async Task<ApiResponse<AuthResponseDto>> UpdateProfileAsync(UpdateProfileRequestDto requestDto)
    {
        var currentUserId = _currentUserService.UserId;
        if (currentUserId == Guid.Empty)
        {
            return ApiResponse<AuthResponseDto>.Fail("Geçerli bir kullanıcı oturumu bulunamadı.");
        }

        // 1. Temel Doğrulamalar
        if (string.IsNullOrWhiteSpace(requestDto.FirstName) || string.IsNullOrWhiteSpace(requestDto.LastName))
        {
            return ApiResponse<AuthResponseDto>.Fail("Ad ve soyad alanları boş bırakılamaz.");
        }

        if (string.IsNullOrWhiteSpace(requestDto.Email) || !requestDto.Email.Contains('@'))
        {
            return ApiResponse<AuthResponseDto>.Fail("Lütfen geçerli bir e-posta adresi girin.");
        }

        // 2. Kullanıcıyı ve Şirketini bul
        var user = await _context.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Id == currentUserId);

        if (user == null)
        {
            return ApiResponse<AuthResponseDto>.Fail("Kullanıcı profili bulunamadı.");
        }

        // 3. E-posta adresi değiştiyse başka bir hesapta kullanımda mı kontrol et
        var normalizedEmail = requestDto.Email.Trim().ToLowerInvariant();
        if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailExists = await _context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.Email.ToLower() == normalizedEmail && u.Id != currentUserId);

            if (emailExists)
            {
                return ApiResponse<AuthResponseDto>.Fail("Bu e-posta adresi başka bir kullanıcı tarafından kullanılmaktadır.");
            }

            user.Email = normalizedEmail;
        }

        // 4. İsim ve telefon bilgilerini güncelle
        user.FirstName = requestDto.FirstName.Trim();
        user.LastName = requestDto.LastName.Trim();
        if (requestDto.PhoneNumber != null)
        {
            user.PhoneNumber = requestDto.PhoneNumber.Trim();
        }

        // 5. Şifre değiştirme talebi varsa doğrula ve güncelle
        if (!string.IsNullOrWhiteSpace(requestDto.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(requestDto.CurrentPassword))
            {
                return ApiResponse<AuthResponseDto>.Fail("Şifrenizi değiştirmek için lütfen mevcut şifrenizi girin.");
            }

            if (requestDto.NewPassword.Length < 6)
            {
                return ApiResponse<AuthResponseDto>.Fail("Yeni şifreniz en az 6 karakter uzunluğunda olmalıdır.");
            }

            bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(requestDto.CurrentPassword, user.PasswordHash);
            if (!isPasswordCorrect)
            {
                return ApiResponse<AuthResponseDto>.Fail("Mevcut şifreniz hatalı.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(requestDto.NewPassword);
            user.MustChangePassword = false;
        }

        await _context.SaveChangesAsync();

        // 6. Güncellenmiş Claims içeren yeni bir JWT Token üret ve dön
        var token = GenerateJwtToken(user);
        var responseDto = new AuthResponseDto
        {
            Token = token,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            TenantName = user.Tenant?.Name ?? "Şirket",
            UserId = user.Id,
            TenantId = user.TenantId,
            MustChangePassword = user.MustChangePassword
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Profil bilgileriniz başarıyla güncellendi.");
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("TenantId", user.TenantId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.GivenName, user.FirstName ?? string.Empty),
            new Claim(ClaimTypes.Surname, user.LastName ?? string.Empty),
            new Claim(ClaimTypes.Role, user.Role ?? "Developer"),
            new Claim("MustChangePassword", user.MustChangePassword.ToString())
        };

        var secret = _config["JwtSettings:Secret"];
        if (string.IsNullOrEmpty(secret))
        {
            secret = Environment.GetEnvironmentVariable("JwtSettings__Secret") ?? "CodeMind_Super_Secret_Key_For_JWT_Auth_2026!+";
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"] ?? "CodeMindApi",
            audience: _config["JwtSettings:Audience"] ?? "CodeMindClients",
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
