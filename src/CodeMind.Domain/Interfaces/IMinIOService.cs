public interface IMinIOService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
}