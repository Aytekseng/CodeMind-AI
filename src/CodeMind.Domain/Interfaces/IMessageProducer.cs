using System.Threading.Tasks;

namespace CodeMind.Domain.Interfaces;

public interface IMessageProducer
{
    Task ProduceAsync<T>(string topic, T message);
}
