namespace CodeMind.Domain.Interfaces;

// Sistemde o an işlem yapan kullanıcının kimlik bilgilerine (Token üzerinden) erişmemizi sağlayan servis arayüzü
public interface ICurrentUserService
{
    // TODO: Kullanıcının ID'sini döndürecek property (örn: Guid UserId { get; })
    public Guid UserId { get; }
    
    // TODO: Kullanıcının Şirket (Tenant) ID'sini döndürecek property (örn: Guid TenantId { get; })
    public Guid TenantId { get;}
}
