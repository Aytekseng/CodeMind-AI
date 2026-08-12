using System.Text.Json;
using Confluent.Kafka;

public class KafkaProducer : IMessageProducer
{
    private readonly string _bootstrapServers = "localhost:9092";
    public async Task ProduceAsync<T>(string topic, T message)
    {
        var config = new ProducerConfig
        {
            BootstrapServers = _bootstrapServers
        };

        using var producer = new ProducerBuilder<Null, string>(config).Build();

        var messageString = JsonSerializer.Serialize(message);

        await producer.ProduceAsync(topic, new Message<Null, string>{ Value = messageString });
    }
}