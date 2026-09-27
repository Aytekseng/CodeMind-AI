using System;
using System.Collections.Generic;

namespace CodeMind.Domain.DTOs;

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

public class ZipUploadResponseDto
{
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    public int TotalExtractedFiles { get; set; }
    public List<string> ExtractedFiles { get; set; } = new();
    public List<Guid> DocumentIds { get; set; } = new();
}

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

public class DashboardStatsDto
{
    public int TotalDocuments { get; set; }
    public double AverageScore { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
    public List<DocumentHistoryDto> RecentDocuments { get; set; } = new();
}
