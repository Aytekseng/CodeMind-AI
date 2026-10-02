using System;

namespace CodeMind.Domain.DTOs.Document;

public class ProjectFileDto
{
    public Guid DocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Severity { get; set; } = "İnceleniyor";
    public int Score { get; set; } = 85;
    public string? ModelUsed { get; set; } = "Llama 3";
}
