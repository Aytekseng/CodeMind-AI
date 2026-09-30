namespace CodeMind.Domain.DTOs.Team;

public class DeleteCompanyRequestDto
{
    public string Password { get; set; } = string.Empty;
    public string ConfirmationCompanyName { get; set; } = string.Empty;
}
