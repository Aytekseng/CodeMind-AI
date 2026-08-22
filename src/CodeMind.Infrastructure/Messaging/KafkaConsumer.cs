using System.Text.Json;
using Confluent.Kafka;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CodeMind.Infrastructure.Messaging;

public class KafkaConsumer : IMessageConsumer
{
    private readonly IConfiguration _config;

    public KafkaConsumer(IConfiguration config)
    {
        _config = config;
    }

    public async Task StartConsumingAsync<T>(string topic, Func<T, Task> onMessageReceived, CancellationToken cancellationToken)
    {
        var bootstrapServers = "localhost:9092";
        var config = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers, 
            GroupId = "codemind-dotnet-consumer",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            MaxPollIntervalMs = 900000, // 15 dakika
            SessionTimeoutMs = 45000,
            EnableAutoCommit = true
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        await Task.Run(async () =>
        {
            try
            {
                using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
                consumer.Subscribe(topic);

                while (!cancellationToken.IsCancellationRequested)
                {
                    try
                    {
                        var consumeResult = consumer.Consume(cancellationToken);
                        if (consumeResult?.Message?.Value != null)
                        {
                            var messageStr = consumeResult.Message.Value;
                            var eventData = JsonSerializer.Deserialize<T>(messageStr, jsonOptions);
                            
                            if (eventData != null && onMessageReceived != null)
                            {
                                await onMessageReceived(eventData);
                            }
                        }
                    }
                    catch (ConsumeException e)
                    {
                        Console.WriteLine($"[KafkaConsumer Uyarı]: {e.Error.Reason}");
                        if (!cancellationToken.IsCancellationRequested)
                        {
                            await Task.Delay(2000, CancellationToken.None);
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[KafkaConsumer Hata]: {ex.Message}");
                        if (!cancellationToken.IsCancellationRequested)
                        {
                            await Task.Delay(2000, CancellationToken.None);
                        }
                    }
                }
                consumer.Close();
            }
            catch (OperationCanceledException)
            {
                // App is shutting down gracefully
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[KafkaConsumer Fatal]: {ex.Message}");
            }
        }, cancellationToken);
    }
}

