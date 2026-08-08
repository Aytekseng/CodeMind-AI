using CodeMind.Domain.Enums;

namespace CodeMind.Domain.Entities;

// Yapay zeka tarafından analiz edilmek üzere projeye yüklenen her bir kod veya metin dosyasını temsil eder.
public class Document : BaseEntity
{
    // Dokümanın bağlı olduğu Projenin eşsiz kimliği
    public Guid ProjectId { get; set; }
    
    // Dosyanın orijinal adı (örn: UserService.cs)
    public string FileName { get; set; } = string.Empty;
    
    // Dosyanın Object Storage (S3/MinIO) üzerindeki barındırılma adresi
    public string StorageUrl { get; set; } = string.Empty;
    
    // Dosyanın mevcut analiz durumu (Bekliyor, İşleniyor, Tamamlandı)
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;

    // Dokümanın ait olduğu Proje varlığı (N-1)
    public Project Project { get; set; } = null!;

    // Bu dokümana ait yapay zeka tarafından üretilmiş analiz raporlarının listesi (1-N)
    public ICollection<AnalysisReport> AnalysisReports { get; set; } = new HashSet<AnalysisReport>();
}
