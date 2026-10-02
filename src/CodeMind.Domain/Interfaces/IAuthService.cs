using System.Threading.Tasks;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Auth.Requests;
using CodeMind.Domain.DTOs.Auth.Responses;

namespace CodeMind.Domain.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto requestDto);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto requestDto);
    Task<ApiResponse<AuthResponseDto>> GetCurrentUserProfileAsync();
    Task<ApiResponse<AuthResponseDto>> UpdateProfileAsync(UpdateProfileRequestDto requestDto);
}
