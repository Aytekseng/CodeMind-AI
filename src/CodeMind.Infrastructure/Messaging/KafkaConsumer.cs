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
        // .env'deki KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS (kafka:29092) Docker içindeki UI içindir.
        // Biz Windows'tan (dışarıdan) bağlandığımız için localhost:9092 kullanmalıyız.
        var bootstrapServers = "localhost:9092";
        var config = new ConsumerConfig
        {
            BootstrapServers = bootstrapServers, 
            GroupId = "codemind-dotnet-consumer",
            AutoOffsetReset = AutoOffsetReset.Earliest
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
        consumer.Subscribe(topic);

        // Arka planda kilitlenmeyi önlemek için Task.Run kullanıyoruz
        await Task.Run(async () =>
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(cancellationToken);
                    if (consumeResult != null)
                    {
                        var messageStr = consumeResult.Message.Value;
                        var eventData = JsonSerializer.Deserialize<T>(messageStr);
                        
                        if (eventData != null)
                        {
                            // Mesaj geldiğinde, çağıran metodun (BackgroundService'in) kodunu çalıştır
                            await onMessageReceived(eventData);
                        }
                    }
                }
                catch (ConsumeException e)
                {
                    Console.WriteLine($"[KafkaConsumer Uyarı]: {e.Error.Reason}");
                    // Kuyruk henüz oluşmamışsa 2 saniye bekleyip tekrar dene
                    await Task.Delay(2000, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    // Uygulama kapanıyor, döngüden çık
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[KafkaConsumer Hata]: {ex.Message}");
                    await Task.Delay(2000, cancellationToken);
                }
            }
            consumer.Close();
        }, cancellationToken);
    }
}
