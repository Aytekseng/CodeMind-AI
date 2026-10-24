namespace CodeMind.Domain.Events;
public class SecurityFinding
{
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public int LineNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}
public class AnalysisCompletedEvent
{
    public Guid FileId { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string AiSuggestion { get; set; } = string.Empty;
    public string? ModelUsed { get; set; }
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public List<SecurityFinding> Findings { get; set; } = new();
}
