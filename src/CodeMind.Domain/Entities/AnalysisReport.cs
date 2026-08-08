namespace CodeMind.Domain.Entities;

// Yapay zeka servisinden (AI Worker) dönen analiz ve güvenlik denetimi sonuçlarını temsil eder.
public class AnalysisReport : BaseEntity
{
    // Analiz sonucunun ait olduğu Dokümanın eşsiz kimliği
    public Guid DocumentId { get; set; }
    
    // Bulunan sorunun ciddiyet seviyesi (High, Medium, Low vb.)
    public string Severity { get; set; } = string.Empty;
    
    // Kod dosyasında sorunun bulunduğu veya analizin yapıldığı satır numarası
    public int LineNumber { get; set; }
    
    // LLM (Yapay Zeka) tarafından üretilen iyileştirme önerisi veya çözüm raporu
    public string AiSuggestion { get; set; } = string.Empty;
    
    // Analiz edilen kod parçasının orijinal hali
    public string OriginalCode { get; set; } = string.Empty;

    // Analiz raporunun ait olduğu Doküman varlığı (N-1)
    public Document Document { get; set; } = null!;
}
