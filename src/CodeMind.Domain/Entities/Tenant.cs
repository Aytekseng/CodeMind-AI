using CodeMind.Domain.Enums;

namespace CodeMind.Domain.Entities;

// Sistemi kullanan Müşteriyi (Şirketi) temsil eder. (Multi-tenancy yapısının temel birimi)
public class Tenant : BaseEntity
{
    // Şirket veya Müşterinin tam adı
    public string Name { get; set; } = string.Empty;

    // Şirketin sistemdeki abonelik seviyesi (Ücretsiz, Profesyonel vb.)
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;

    // Bu şirkete bağlı olan kullanıcıların listesi (1-N)
    public ICollection<User> Users { get; set; } = new HashSet<User>();

    // Bu şirkete ait olan kod depolarının/projelerin listesi (1-N)
    public ICollection<Project> Projects { get; set; } = new HashSet<Project>();
}
