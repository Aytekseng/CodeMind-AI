using System;

namespace CodeMind.Domain.Interfaces;

public interface ITempKeyVaultService
{
    string StoreKey(string apiKey, TimeSpan? ttl = null);
    string? GetKey(string keyToken);
    string? ConsumeKey(string keyToken);
}
