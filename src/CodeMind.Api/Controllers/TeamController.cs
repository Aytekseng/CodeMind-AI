using System;
using System.Threading.Tasks;
using CodeMind.Domain.Constants;
using CodeMind.Domain.DTOs.Team;
using CodeMind.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeMind.Api.Controllers;

[Authorize(Roles = Roles.Admin)]
[ApiController]
[Route("api/[controller]")]
public class TeamController : ControllerBase
{
    private readonly ITeamService _teamService;

    public TeamController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        var response = await _teamService.GetTeamMembersAsync();
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpPost("members")]
    public async Task<IActionResult> CreateMember([FromBody] CreateTeamMemberRequestDto requestDto)
    {
        var response = await _teamService.CreateTeamMemberAsync(requestDto);
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpPut("members/{id:guid}/role")]
    public async Task<IActionResult> UpdateMemberRole(Guid id, [FromBody] UpdateTeamMemberRoleRequestDto requestDto)
    {
        var response = await _teamService.UpdateMemberRoleAsync(id, requestDto);
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpDelete("members/{id:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id)
    {
        var response = await _teamService.RemoveTeamMemberAsync(id);
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpPost("delete-company")]
    public async Task<IActionResult> DeleteCompany([FromBody] DeleteCompanyRequestDto requestDto)
    {
        var response = await _teamService.DeleteCompanyWorkspaceAsync(requestDto);
        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpGet("export-data")]
    public async Task<IActionResult> ExportData()
    {
        var response = await _teamService.ExportCompanyDataAsync();
        if (!response.IsSuccess || response.Data == null)
            return BadRequest(response);

        var jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        };

        var jsonBytes = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(response.Data, jsonOptions);
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var fileName = $"codemind-company-export-{timestamp}.json";

        return File(jsonBytes, "application/json", fileName);
    }

    [HttpGet("export-pdf")]
    public async Task<IActionResult> ExportDataPdf([FromServices] IPdfExportService pdfExportService)
    {
        var response = await _teamService.ExportCompanyDataAsync();
        if (!response.IsSuccess || response.Data == null)
            return BadRequest(response);

        var pdfBytes = pdfExportService.GenerateCompanyAuditReportPdf(response.Data);
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var fileName = $"codemind-company-audit-report-{timestamp}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }
}
