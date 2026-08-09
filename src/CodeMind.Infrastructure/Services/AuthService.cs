using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CodeMind.Domain.DTOs;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.DTOs.Auth.Responses;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

using AutoMapper;

namespace CodeMind.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;
    private readonly IMapper _mapper;

    public AuthService(AppDbContext context, IConfiguration config, IMapper mapper)
    {
        _context = context;
        _config = config;
        _mapper = mapper;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto requestDto)
    {
        // 1. E-posta kontrolü (Filtreleri yoksayarak tüm veritabanında arıyoruz)
        var userExists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == requestDto.Email);
        if (userExists)
            return ApiResponse<AuthResponseDto>.Fail("Bu e-posta adresi zaten kullanımda.");

        // 2. Yeni Şirket (Tenant) oluştur (AutoMapper ile)
        var newTenant = _mapper.Map<Tenant>(requestDto);
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
            UserId = newUser.Id,
            TenantId = newUser.TenantId
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Kayıt işlemi başarıyla tamamlandı.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto requestDto)
    {
        // 1. Kullanıcıyı bul (Giriş anında henüz oturum açılmadığı için QueryFilter'ı yoksaymalıyız!)
        var user = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == requestDto.Email);
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
            UserId = user.Id,
            TenantId = user.TenantId
        };

        return ApiResponse<AuthResponseDto>.Success(responseDto, "Giriş başarılı.");
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("TenantId", user.TenantId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
