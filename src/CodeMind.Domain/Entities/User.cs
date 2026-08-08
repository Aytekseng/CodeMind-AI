namespace CodeMind.Domain.Entities;

// Sisteme giriş yapan ve projeleri yöneten bireysel kullanıcıyı temsil eder.
public class User : BaseEntity
{
    // Kullanıcının bağlı olduğu Şirketin (Tenant) eşsiz kimliği
    public Guid TenantId { get; set; }
    
    // Sisteme giriş yapmak için kullanılan e-posta adresi
    public string Email { get; set; } = string.Empty;
    
    // Şifrelenmiş parola bilgisi (Hash)
    public string PasswordHash { get; set; } = string.Empty;
    
    // Kullanıcının sistemdeki rolü (Admin, Developer vb.)
    public string Role { get; set; } = string.Empty;

    // Kullanıcının ait olduğu Şirket (Tenant) varlığı (N-1)
    public Tenant Tenant { get; set; } = null!;
}
