namespace CodeMind.Domain.DTOs.Team;

public class CreateTeamMemberRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "Developer";
    public string TemporaryPassword { get; set; } = string.Empty;
}
