using System.Text.Json;
using School.Application.Interfaces;
using StackExchange.Redis;

namespace School.Infrastructure.Services;

public class CacheService : ICacheService
{
    private readonly IDatabase _database;

    public CacheService(IConnectionMultiplexer redis)
    {
        _database = redis.GetDatabase();
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expirationTime = null)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var serializedResponse = JsonSerializer.Serialize(value, options);

        if (expirationTime.HasValue)
        {
            await _database.StringSetAsync(key, serializedResponse, expirationTime.Value);
        }
        else
        {
            await _database.StringSetAsync(key, serializedResponse);
        }
    }

    public async Task<T> GetAsync<T>(string key)
    {
        var cachedResponse = await _database.StringGetAsync(key);

        if (cachedResponse.IsNullOrEmpty)
        {
            return default!;
        }

        return JsonSerializer.Deserialize<T>(cachedResponse.ToString())!;
    }

    public async Task RemoveAsync(string key)
    {
        await _database.KeyDeleteAsync(key);
    }

    public async Task<bool> ExistsAsync(string key)
    {
        return await _database.KeyExistsAsync(key);
    }
}
