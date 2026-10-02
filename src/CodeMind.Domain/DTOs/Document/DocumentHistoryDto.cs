using System;

namespace CodeMind.Domain.DTOs.Document;

public class DocumentHistoryDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Severity { get; set; } = "Güvenli";
    public int Score { get; set; } = 85;
    public int FindingsCount { get; set; }
    public string? LatestAiSuggestion { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public string? ModelUsed { get; set; } = "Llama 3";
}
