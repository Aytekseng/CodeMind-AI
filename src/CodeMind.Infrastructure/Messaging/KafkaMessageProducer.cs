using System.Text.Json;
using System.Threading.Tasks;
using Confluent.Kafka;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeMind.Infrastructure.Messaging;

public class KafkaMessageProducer : IMessageProducer
{
    private readonly string _bootstrapServers;
    private readonly ILogger<KafkaMessageProducer> _logger;

    public KafkaMessageProducer(IConfiguration config, ILogger<KafkaMessageProducer> logger)
    {
        _bootstrapServers = config["KafkaSettings:BootstrapServers"] ?? "localhost:9092";
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

        var deliveryResult = await producer.ProduceAsync(topic, new Message<Null, string> { Value = messageString });

        _logger.LogInformation("Kafka mesajı üretildi. Konu: {Topic}, Bölüm: {Partition}, Offset: {Offset}", 
            topic, deliveryResult.Partition.Value, deliveryResult.Offset.Value);
    }
}
