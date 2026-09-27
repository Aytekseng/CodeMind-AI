namespace CodeMind.Domain.Events;

public class AnalysisCompletedEvent
{
    public Guid FileId { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string AiSuggestion { get; set; } = string.Empty;
    public string? ModelUsed { get; set; } = "Llama 3";
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
}