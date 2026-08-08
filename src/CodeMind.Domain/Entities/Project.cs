namespace CodeMind.Domain.Entities;

// Analiz edilecek bir yazılım projesini veya kod deposunu temsil eder.
public class Project : BaseEntity
{
    // Projenin bağlı olduğu Şirketin (Tenant) eşsiz kimliği
    public Guid TenantId { get; set; }
    
    // Projenin adı
    public string Name { get; set; } = string.Empty;
    
    // Projenin ana programlama dili (C#, Python, Java vb.)
    public string Language { get; set; } = string.Empty;

    // Projenin ait olduğu Şirket (Tenant) varlığı (N-1)
    public Tenant Tenant { get; set; } = null!;

    // Bu projeye yüklenmiş olan doküman veya kaynak kod dosyalarının listesi (1-N)
    public ICollection<Document> Documents { get; set; } = new HashSet<Document>();
}
