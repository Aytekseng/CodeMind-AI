namespace CodeMind.Domain.Events;

public class AnalysisCompletedEvent
{
    public Guid FileId { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string AiSuggestion { get; set; } = string.Empty;
}