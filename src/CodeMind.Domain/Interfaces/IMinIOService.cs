using System.IO;
using System.Threading.Tasks;

namespace CodeMind.Domain.Interfaces;

public interface IMinIOService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
    Task<string> GetFileTextAsync(string objectName);
}