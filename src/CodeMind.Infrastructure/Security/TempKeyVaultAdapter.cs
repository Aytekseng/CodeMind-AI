using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Caching.Memory;
namespace CodeMind.Infrastructure.Security;
// Job-bound keys are memory-only. Restart requires resubmission, never another billing account.
public sealed class TempKeyVaultAdapter(IMemoryCache cache) : ITempKeyVaultService
{
    public void StoreKey(Guid documentId, string apiKey) =>
        cache.Set($"job-key:{documentId}", apiKey.Trim(), TimeSpan.FromHours(24));
    public string? GetKey(Guid documentId) => cache.Get<string>($"job-key:{documentId}");
    public void RemoveKey(Guid documentId) => cache.Remove($"job-key:{documentId}");
}
