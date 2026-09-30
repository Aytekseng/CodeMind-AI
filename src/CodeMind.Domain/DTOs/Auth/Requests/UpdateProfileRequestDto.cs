namespace CodeMind.Domain.DTOs.Auth.Requests;

public class UpdateProfileRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }

    // Parola değişikliği opsiyoneldir; yalnızca şifre güncellenmek istendiğinde doldurulur
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}
