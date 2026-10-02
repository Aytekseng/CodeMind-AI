namespace CodeMind.Domain.DTOs.Auth.Requests;

public record RegisterRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
