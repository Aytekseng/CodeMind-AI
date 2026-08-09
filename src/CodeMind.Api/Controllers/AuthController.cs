using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace CodeMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }
    // TODO: Test yapabilmek için geçici bir "Login" veya "GenerateToken" endpoint'i (metodu) yazın.
    // Gelen isteğe göre JwtSecurityToken kullanarak sahte bir token üretip dönmesini sağlayın.
    // Token içerisine (Claims) örnek bir TenantId ve UserId gömmeniz gerekecek.

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequestDto requestDto)
    {
        return Ok(await _authService.RegisterAsync(requestDto));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto requestDto)
    {
        return Ok(await _authService.LoginAsync(requestDto));
    }

}
