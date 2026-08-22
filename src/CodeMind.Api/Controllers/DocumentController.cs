using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.DTOs;

namespace CodeMind.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IDocumentService _documentService;

    public DocumentController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("Dosya seçilmedi.", "Lütfen bir dosya seçin."));

        using var stream = file.OpenReadStream();
        var response = await _documentService.UploadAndQueueDocumentAsync(stream, file.FileName, file.ContentType);

        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var response = await _documentService.GetDocumentHistoryAsync();
        return Ok(response);
    }

    [HttpGet("{id:guid}/report")]
    public async Task<IActionResult> GetReport(Guid id)
    {
        var response = await _documentService.GetDocumentReportAsync(id);
        if (!response.IsSuccess)
            return NotFound(response);

        return Ok(response);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var response = await _documentService.GetDashboardStatsAsync();
        return Ok(response);
    }
}