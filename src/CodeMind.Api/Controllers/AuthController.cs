using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequestDto requestDto)
    {
        var response = await _authService.RegisterAsync(requestDto);
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto requestDto)
    {
        var response = await _authService.LoginAsync(requestDto);
        if (!response.IsSuccess)
            return Unauthorized(response);

        return Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var response = await _authService.GetCurrentUserProfileAsync();
        if (!response.IsSuccess)
            return NotFound(response);

        return Ok(response);
    }
}

