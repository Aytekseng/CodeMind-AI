using Microsoft.AspNetCore.Mvc;
using CodeMind.Domain.Interfaces;
using CodeMind.Domain.DTOs;

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
}