namespace CodeMind.Domain.Interfaces;

public interface ITempKeyVaultService
{
    /// <summary>
    /// Stores the raw API key in-memory with a short TTL (default: 90s) and returns a random token.
    /// </summary>
    string StoreKey(string apiKey, TimeSpan? ttl = null);

    /// <summary>
    /// Retrieves the key without removing it (useful for multi-file zip batches). Still expires at TTL.
    /// </summary>
    string? GetKey(string keyToken);

    /// <summary>
    /// Consumes and immediately removes the key from memory. Returns null if expired or not found.
    /// </summary>
    string? ConsumeKey(string keyToken);
}
