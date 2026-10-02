using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Team;

namespace CodeMind.Domain.Interfaces;

public interface ITeamService
{
    Task<ApiResponse<List<TeamMemberDto>>> GetTeamMembersAsync();
    Task<ApiResponse<TeamMemberDto>> CreateTeamMemberAsync(CreateTeamMemberRequestDto requestDto);
    Task<ApiResponse<TeamMemberDto>> UpdateMemberRoleAsync(Guid memberId, UpdateTeamMemberRoleRequestDto requestDto);
    Task<ApiResponse<string>> RemoveTeamMemberAsync(Guid memberId);
    Task<ApiResponse<string>> DeleteCompanyWorkspaceAsync(DeleteCompanyRequestDto requestDto);
    Task<ApiResponse<CompanyExportDto>> ExportCompanyDataAsync();
}
