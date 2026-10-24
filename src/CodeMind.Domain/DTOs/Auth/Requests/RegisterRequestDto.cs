using System.ComponentModel.DataAnnotations;
namespace CodeMind.Domain.DTOs.Auth.Requests;

public record RegisterRequestDto
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(254)]
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    [Required, MaxLength(72)]
    public string Password { get; set; } = string.Empty;
}
