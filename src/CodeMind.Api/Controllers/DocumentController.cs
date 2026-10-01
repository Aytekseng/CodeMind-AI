using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.DTOs;

namespace CodeMind.Api.Controllers;

[Authorize]
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
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFile([FromForm] UploadDocumentRequest request)
    {
        if (User.IsInRole("Auditor"))
        {
            return StatusCode(StatusCodes.Status403Forbidden, 
                ApiResponse<string>.Fail("Güvenlik Denetçisi (Auditor) rolündeki kullanıcıların kod yükleme ve analiz başlatma yetkisi bulunmamaktadır. Yalnızca raporları inceleyebilirsiniz."));
        }

        var file = request.File;
        var model = request.Model;
        var apiKey = request.ApiKey;

        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<string>.Fail("Dosya seçilmedi veya boş dosya.", "Lütfen geçerli bir dosya seçin."));

        var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();

        using var stream = file.OpenReadStream();

        // 1. Eğer dosya bir .ZIP arşivi ise çoklu dosya işleyicisine yönlendir
        if (extension == ".zip" || file.ContentType == "application/zip" || file.ContentType == "application/x-zip-compressed")
        {
            var zipResponse = await _documentService.UploadAndQueueZipAsync(stream, file.FileName, model, apiKey);
            if (!zipResponse.IsSuccess)
                return BadRequest(zipResponse);

            return Ok(zipResponse);
        }

        // 2. Tekil kod dosyası ise mevcut işleyiciyi kullan
        var response = await _documentService.UploadAndQueueDocumentAsync(stream, file.FileName, file.ContentType ?? "application/octet-stream", model, apiKey);

        if (!response.IsSuccess)
            return BadRequest(response);

        return Ok(response);
    }

    [HttpGet("project/{projectId:guid}/files")]
    public async Task<IActionResult> GetProjectFiles(Guid projectId)
    {
        var response = await _documentService.GetProjectDocumentsAsync(projectId);
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

    [HttpGet("{documentId:guid}/export/json")]
    public async Task<IActionResult> ExportDocumentReportJson(Guid documentId)
    {
        var response = await _documentService.ExportDocumentReportJsonAsync(documentId);
        if (!response.IsSuccess || response.Data == null)
            return NotFound(response);

        var jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        };

        var jsonBytes = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(response.Data, jsonOptions);
        var cleanFileName = System.IO.Path.GetFileNameWithoutExtension(response.Data.Document.FileName);
        if (string.IsNullOrWhiteSpace(cleanFileName)) cleanFileName = documentId.ToString();
        var safeFileName = string.Join("_", cleanFileName.Split(System.IO.Path.GetInvalidFileNameChars()));
        var downloadName = $"codemind-report-{safeFileName}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json";

        return File(jsonBytes, "application/json", downloadName);
    }

    [HttpGet("{documentId:guid}/export/pdf")]
    public async Task<IActionResult> ExportDocumentReportPdf(Guid documentId, [FromServices] IPdfExportService pdfExportService)
    {
        var response = await _documentService.ExportDocumentReportJsonAsync(documentId);
        if (!response.IsSuccess || response.Data == null)
            return NotFound(response);

        var pdfBytes = pdfExportService.GenerateDocumentReportPdf(response.Data);
        var cleanFileName = System.IO.Path.GetFileNameWithoutExtension(response.Data.Document.FileName);
        if (string.IsNullOrWhiteSpace(cleanFileName)) cleanFileName = documentId.ToString();
        var safeFileName = string.Join("_", cleanFileName.Split(System.IO.Path.GetInvalidFileNameChars()));
        var downloadName = $"codemind-report-{safeFileName}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";

        return File(pdfBytes, "application/pdf", downloadName);
    }
}

public class UploadDocumentRequest
{
    public IFormFile File { get; set; } = null!;
    public string? Model { get; set; } = "llama3";
    public string? ApiKey { get; set; }
}