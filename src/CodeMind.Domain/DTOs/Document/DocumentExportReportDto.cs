using System;
using System.Collections.Generic;

namespace CodeMind.Domain.DTOs.Document;

public class DocumentExportReportDto
{
    public ExportReportMetaDto Metadata { get; set; } = new();
    public DocumentInfoExportDto Document { get; set; } = new();
    public AnalysisFindingExportDto Analysis { get; set; } = new();
}

public class ExportReportMetaDto
{
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
    public string CompanyName { get; set; } = string.Empty;
    public string? ProjectName { get; set; }
    public string System { get; set; } = "CodeMind-AI Automated Code Review";
    public string Version { get; set; } = "1.0.0";
}

public class DocumentInfoExportDto
{
    public Guid DocumentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string OriginalCode { get; set; } = string.Empty;
}

public class AnalysisFindingExportDto
{
    public string Severity { get; set; } = "Güvenli";
    public int Score { get; set; } = 85;
    public string ModelUsed { get; set; } = "Llama 3";
    public int LineNumber { get; set; }
    public List<int> VulnerableLines { get; set; } = new();
    public string AiSuggestion { get; set; } = string.Empty;
}
