using System;

namespace CodeMind.Domain.DTOs.Team;

public class TeamMemberDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
}

public class CreateTeamMemberRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "Developer";
    public string TemporaryPassword { get; set; } = string.Empty;
}

public class UpdateTeamMemberRoleRequestDto
{
    public string Role { get; set; } = string.Empty;
}
