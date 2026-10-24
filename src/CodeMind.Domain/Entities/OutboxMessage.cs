namespace CodeMind.Domain.Entities;
public class OutboxMessage : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;
    public string Payload { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public int Attempts { get; set; }
}
