using System.Text.Json;
using Confluent.Kafka;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Logging;

public class KafkaProducer : IMessageProducer
{
    private readonly string _bootstrapServers = "localhost:9092";
    private readonly ILogger<KafkaProducer> _logger;

    public KafkaProducer(ILogger<KafkaProducer> logger)
    {
        _logger = logger;
    }

    public async Task ProduceAsync<T>(string topic, T message)
    {
        var config = new ProducerConfig
        {
            BootstrapServers = _bootstrapServers
        };

        using var producer = new ProducerBuilder<Null, string>(config).Build();

        var messageString = JsonSerializer.Serialize(message);

        var deliveryResult = await producer.ProduceAsync(topic, new Message<Null, string>{ Value = messageString });

        _logger.LogInformation("Kafka mesajı üretildi. Konu: {Topic}, Bölüm: {Partition}, Offset: {Offset}", 
            topic, deliveryResult.Partition.Value, deliveryResult.Offset.Value);
    }
}