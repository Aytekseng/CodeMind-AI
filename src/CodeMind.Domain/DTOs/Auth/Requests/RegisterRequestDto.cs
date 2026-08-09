namespace CodeMind.Domain.DTOs.Auth.Requests;

public record RegisterRequestDto
{
    // TODO: Kullanıcının kayıt olurken göndermesi gereken bilgileri buraya tanımlayın (Örn: TenantName, Email, Password vb.)
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
