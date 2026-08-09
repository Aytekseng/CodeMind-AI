namespace CodeMind.Domain.DTOs.Auth.Requests;

public record LoginRequestDto
{
    // TODO: Kullanıcının giriş yaparken göndermesi gereken bilgileri buraya tanımlayın (Örn: Email, Password)
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
