public class FileUploadedEvent
{
    public Guid FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string UploadedByUserId { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}