using CodeMind.Domain.Enums;

namespace CodeMind.Domain.Entities;

// Yapay zeka tarafından analiz edilmek üzere projeye yüklenen her bir kod veya metin dosyasını temsil eder.
public class Document : BaseEntity
{
    public Guid? UploadedByUserId { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public bool RequiresApiKey { get; set; }
    public string? ErrorMessage { get; set; }
    // Dokümanın bağlı olduğu Projenin eşsiz kimliği
    public Guid ProjectId { get; set; }
    
    // Dosyanın orijinal adı (örn: UserService.cs)
    public string FileName { get; set; } = string.Empty;
    
    // Dosyanın Object Storage (S3/MinIO) üzerindeki barındırılma adresi
    public string StorageUrl { get; set; } = string.Empty;
    
    // Dosyanın mevcut analiz durumu (Bekliyor, İşleniyor, Tamamlandı)
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;

    // Analiz için seçilen yapay zeka modeli (örn: llama3, qwen2.5-coder, gemini-3.8-flash)
    public string? Model { get; set; } = "llama3";

    // Dokümanın ait olduğu Proje varlığı (N-1)
    public Project Project { get; set; } = null!;

    // Bu dokümana ait yapay zeka tarafından üretilmiş analiz raporlarının listesi (1-N)
    public ICollection<AnalysisReport> AnalysisReports { get; set; } = new HashSet<AnalysisReport>();
}
