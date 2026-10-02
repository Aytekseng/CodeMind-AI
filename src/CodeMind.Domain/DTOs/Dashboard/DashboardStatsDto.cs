using System.Collections.Generic;
using CodeMind.Domain.DTOs.Document;

namespace CodeMind.Domain.DTOs.Dashboard;

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
