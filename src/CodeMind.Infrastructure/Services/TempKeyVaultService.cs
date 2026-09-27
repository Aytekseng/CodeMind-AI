using System;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CodeMind.Infrastructure.Services;

public class TempKeyVaultService : ITempKeyVaultService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<TempKeyVaultService> _logger;
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromSeconds(90);

    public TempKeyVaultService(IMemoryCache cache, ILogger<TempKeyVaultService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public string StoreKey(string apiKey, TimeSpan? ttl = null)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            return string.Empty;

        var token = Guid.NewGuid().ToString("N");
        var expiration = ttl ?? DefaultTtl;

        var entryOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration,
            Priority = CacheItemPriority.High
        };

        _cache.Set(token, apiKey.Trim(), entryOptions);
        _logger.LogInformation("Ephemeral API key stored with token {KeyToken}, TTL: {Ttl}s (Never written to disk or broker)", token, expiration.TotalSeconds);

        return token;
    }

    public string? GetKey(string keyToken)
    {
        if (string.IsNullOrWhiteSpace(keyToken))
            return null;

        if (_cache.TryGetValue(keyToken, out string? apiKey))
        {
            return apiKey;
        }

        _logger.LogWarning("Ephemeral API key token {KeyToken} was either expired or not found", keyToken);
        return null;
    }

    public string? ConsumeKey(string keyToken)
    {
        if (string.IsNullOrWhiteSpace(keyToken))
            return null;

        if (_cache.TryGetValue(keyToken, out string? apiKey))
        {
            // Immediately purge from memory once retrieved (one-time use)
            _cache.Remove(keyToken);
            _logger.LogInformation("Ephemeral API key token {KeyToken} consumed and purged from memory", keyToken);
            return apiKey;
        }

        _logger.LogWarning("Ephemeral API key token {KeyToken} was either expired or already consumed", keyToken);
        return null;
    }
}
