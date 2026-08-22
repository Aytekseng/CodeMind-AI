using CodeMind.Domain.DTOs;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.DTOs.Auth.Responses;

namespace CodeMind.Domain.Interfaces;

public interface IAuthService
{
    // TODO: Register ve Login metotlarının arayüzünü (imzalarını) tanımlayın.
    // Örnek: Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request);
    // Örnek: Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto requestDto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto requestDto);
    Task<ApiResponse<AuthResponseDto>> GetCurrentUserProfileAsync();
}

