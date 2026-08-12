using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly IMessageProducer _messageProducer;

    public TestController(IMessageProducer messageProducer)
    {
        _messageProducer = messageProducer;
    }

    [HttpPost("send-kafka-message")]
    public async Task<IActionResult> SendTestMessage()
    {
        var testEvent = new FileUploadedEvent
        {
            FileId = Guid.NewGuid(),
            FileName = "ornek_dokuman.pdf",
            UploadedByUserId = "test_user_123",
            UploadedAt = DateTime.UtcNow
        };

        await _messageProducer.ProduceAsync("file-uploads", testEvent);

        return Ok("Mesaj başarıyla Kafka'ya iletildi!");
    }
}