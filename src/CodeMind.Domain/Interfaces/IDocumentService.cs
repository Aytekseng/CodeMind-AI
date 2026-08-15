using System.IO;
using CodeMind.Domain.DTOs;

namespace CodeMind.Domain.Interfaces;

public interface IDocumentService
{
    // Clean Architecture kuralı gereği Domain katmanına Web kütüphanesi (IFormFile) bulaştırılmaz.
    // Bu yüzden Stream ve string parametreleri kullanıyoruz.
    Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType);
}
