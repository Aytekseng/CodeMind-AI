using System;
using System.Collections.Generic;

namespace CodeMind.Domain.DTOs.Team;

public class CompanyExportDto
{
    public ExportMetadataDto ExportMetadata { get; set; } = new();
    public CompanyInfoDto Company { get; set; } = new();
    public List<CompanyUserExportDto> Users { get; set; } = new();
    public List<ProjectExportDto> Projects { get; set; } = new();
    public CompanyExportStatsDto Statistics { get; set; } = new();
}

public class ExportMetadataDto
{
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
    public string ExportedBy { get; set; } = string.Empty;
    public string System { get; set; } = "CodeMind-AI Security Platform";
    public string Version { get; set; } = "1.0.0";
}

public class CompanyInfoDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SubscriptionTier { get; set; } = string.Empty;
}

public class CompanyUserExportDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class ProjectExportDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Language { get; set; }
    public List<DocumentExportDto> Documents { get; set; } = new();
}

public class DocumentExportDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StorageUrl { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<AnalysisReportExportDto> AnalysisReports { get; set; } = new();
}

public class AnalysisReportExportDto
{
    public Guid Id { get; set; }
    public string Severity { get; set; } = string.Empty;
    public int LineNumber { get; set; }
    public string ModelUsed { get; set; } = string.Empty;
    public string AiSuggestion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CompanyExportStatsDto
{
    public int TotalProjects { get; set; }
    public int TotalDocuments { get; set; }
    public int TotalReports { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
}
