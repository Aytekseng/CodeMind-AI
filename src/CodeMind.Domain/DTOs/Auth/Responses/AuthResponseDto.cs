namespace CodeMind.Domain.DTOs.Auth.Responses;

public record AuthResponseDto
{
    // TODO: Başarılı giriş/kayıt sonrası kullanıcıya döndürülecek bilgileri tanımlayın (Örn: Token, Email, TenantId)
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
}
