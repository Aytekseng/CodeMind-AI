namespace CodeMind.Domain.Interfaces;
public interface ITempKeyVaultService
{
    void StoreKey(Guid documentId, string apiKey);
    string? GetKey(Guid documentId);
    void RemoveKey(Guid documentId);
}
