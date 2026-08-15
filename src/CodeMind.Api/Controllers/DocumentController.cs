using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly IMinIOService _minIOService;
    private readonly IMessageProducer _kafkaProducer;

    public DocumentController(IMinIOService minIOService, IMessageProducer kafkaProducer)
    {
        _minIOService = minIOService;
        _kafkaProducer = kafkaProducer;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if(file == null || file.Length == 0)
            return BadRequest("Lütfen bir dosya seçin.");

        using var stream = file.OpenReadStream();
        string savedObjectName = await _minIOService.UploadFileAsync(stream, file.FileName, file.ContentType);

        var eventMessage = new
        {
            FileId = Guid.NewGuid(),
            FileName = file.FileName,
            ObjectKey = savedObjectName
        };

        await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);

        return Ok(new {message = "Dosya yüklendi ve analize gönderildi.", objectKey = savedObjectName});
    }

}