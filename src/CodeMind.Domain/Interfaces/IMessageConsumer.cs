namespace CodeMind.Domain.Interfaces;

public interface IMessageConsumer
{
    Task StartConsumingAsync<T>(string topic, Func<T, Task> onMessageReceived, CancellationToken cancellationToken);
}
