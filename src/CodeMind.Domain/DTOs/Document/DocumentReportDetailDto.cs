using System;
using System.Collections.Generic;

namespace CodeMind.Domain.DTOs.Document;

public class DocumentReportDetailDto
{
    public Guid DocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Severity { get; set; } = "Medium";
    public int Score { get; set; } = 85;
    public string AiSuggestion { get; set; } = string.Empty;
    public string OriginalCode { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string? ModelUsed { get; set; } = "Llama 3";
    public List<int> VulnerableLines { get; set; } = new();
}
