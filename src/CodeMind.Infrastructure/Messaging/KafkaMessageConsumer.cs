using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeMind.Infrastructure.Messaging;

public class KafkaMessageConsumer : IMessageConsumer
{
    private readonly IConfiguration _config;
    private readonly ILogger<KafkaMessageConsumer> _logger;

    public KafkaMessageConsumer(IConfiguration config, ILogger<KafkaMessageConsumer> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task StartConsumingAsync<T>(string topic, Func<T, Task> onMessageReceived, CancellationToken cancellationToken)
    {
        var bootstrapServers = _config["KafkaSettings:BootstrapServers"] ?? "localhost:9092";
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
                _logger.LogInformation("Kafka tüketici '{Topic}' konusuna başarıyla abone oldu.", topic);

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
                        _logger.LogWarning("Kafka tüketim uyarısı: {Reason}", e.Error.Reason);
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
                        _logger.LogError(ex, "Kafka mesajı işlenirken hata oluştu.");
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
                _logger.LogCritical(ex, "Kafka tüketici döngüsünde kritik hata.");
            }
        }, cancellationToken);
    }
}
