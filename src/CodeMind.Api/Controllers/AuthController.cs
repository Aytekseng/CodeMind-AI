using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace CodeMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;

    public AuthController(IConfiguration config)
    {
        _config = config;
    }
    // TODO: Test yapabilmek için geçici bir "Login" veya "GenerateToken" endpoint'i (metodu) yazın.
    // Gelen isteğe göre JwtSecurityToken kullanarak sahte bir token üretip dönmesini sağlayın.
    // Token içerisine (Claims) örnek bir TenantId ve UserId gömmeniz gerekecek.

    [HttpGet("test-login")]
    public IActionResult GenerateTestToken()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim("TenantId", Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@codemind.ai")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(2), // 2 saat geçerli
            signingCredentials: creds
        );

        return Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token)
        });
    }

}
