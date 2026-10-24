using System.Text.Json;
using Confluent.Kafka;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
namespace CodeMind.Infrastructure.Messaging;
public sealed class KafkaMessageConsumer(IConfiguration config, ILogger<KafkaMessageConsumer> logger) : IMessageConsumer
{
    public Task StartConsumingAsync<T>(string topic, Func<T, Task> handler, CancellationToken token) => Task.Run(async () =>
    {
        var broker = config["KafkaSettings:BootstrapServers"] ?? "localhost:9094";
        using var consumer = new ConsumerBuilder<Ignore, string>(new ConsumerConfig {
            BootstrapServers = broker, GroupId = "codemind-dotnet-consumer", AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false, EnableAutoOffsetStore = false, MaxPollIntervalMs = 900000 }).Build();
        using var dlq = new ProducerBuilder<Null, string>(new ProducerConfig {
            BootstrapServers = broker, EnableIdempotence = true, MessageTimeoutMs = 15000 }).Build();
        consumer.Subscribe(topic);
        try
        {
            while (!token.IsCancellationRequested)
            {
                ConsumeResult<Ignore, string> record;
                try { record = consumer.Consume(token); }
                catch (ConsumeException ex) { logger.LogWarning("Kafka unavailable: {Code}", ex.Error.Code); await Task.Delay(2000, token); continue; }
                var attempts = 0;
                while (true)
                {
                    try
                    {
                        var value = JsonSerializer.Deserialize<T>(record.Message.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (value == null) throw new JsonException("Null event");
                        await handler(value);
                        break;
                    }
                    catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
                    catch (Exception ex)
                    {
                        attempts++;
                        logger.LogError(ex, "Result processing attempt {Attempt} failed", attempts);
                        if (attempts >= 4)
                        {
                            // If DLQ publish fails, retry this exact record instead of committing past it.
                            try
                            {
                                await dlq.ProduceAsync(topic + "-dead-letter", new Message<Null, string> { Value = record.Message.Value }, token);
                                logger.LogError("Result persisted to dead-letter topic for recovery");
                                break;
                            }
                            catch (KafkaException) { logger.LogWarning("Dead-letter broker unavailable; retaining record"); }
                        }
                        await Task.Delay(TimeSpan.FromSeconds(Math.Min(attempts * 2, 30)), token);
                    }
                }
                // A commit failure must restart the consumer instead of advancing to another record.
                consumer.Commit(record);
            }
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested) { }
        finally { consumer.Close(); }
    }, token);
}
