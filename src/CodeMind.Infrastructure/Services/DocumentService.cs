using System.IO;
using CodeMind.Domain.DTOs;
using CodeMind.Domain.Entities;
using CodeMind.Domain.Interfaces;
using CodeMind.Infrastructure.Data;

namespace CodeMind.Infrastructure.Services;

public class DocumentService : IDocumentService
{
    private readonly IMinIOService _minIOService;
    private readonly IMessageProducer _kafkaProducer;
    private readonly AppDbContext _dbContext;

    public DocumentService(IMinIOService minIOService, IMessageProducer kafkaProducer, AppDbContext dbContext)
    {
        _minIOService = minIOService;
        _kafkaProducer = kafkaProducer;
        _dbContext = dbContext;
    }

    public async Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 1. MinIO'ya yükle
            string savedObjectName = await _minIOService.UploadFileAsync(fileStream, fileName, contentType);

            // 2. Veritabanına ilişkili sahte kayıtları (Foreign Key için) atıyoruz
            var tenant = _dbContext.Tenants.FirstOrDefault();
            if (tenant == null)
            {
                tenant = new Tenant { Id = Guid.NewGuid(), Name = "Test Şirketi" };
                _dbContext.Tenants.Add(tenant);
            }

            var project = _dbContext.Projects.FirstOrDefault();
            if (project == null)
            {
                project = new Project { Id = Guid.NewGuid(), Name = "Test Projesi", TenantId = tenant.Id, Language = "C#" };
                _dbContext.Projects.Add(project);
            }

            var document = new Document 
            { 
                Id = Guid.NewGuid(), 
                ProjectId = project.Id, 
                FileName = fileName, 
                StorageUrl = savedObjectName 
            };
            
            _dbContext.Documents.Add(document);
            await _dbContext.SaveChangesAsync();

            // 3. Kafka'ya mesaj gönder
            var eventMessage = new
            {
                FileId = document.Id,
                FileName = fileName,
                ObjectKey = savedObjectName
            };

            await _kafkaProducer.ProduceAsync("file-uploads", eventMessage);

            // 4. Standart ApiResponse formatında dön
            var responseData = new { ObjectKey = savedObjectName, DocumentId = document.Id };
            return ApiResponse<object>.Success(responseData, "Dosya yüklendi ve analize gönderildi.");
        }
        catch (Exception ex)
        {
            return ApiResponse<object>.Fail(ex.Message, "Dosya yüklenirken veya kuyruğa atılırken bir hata oluştu.");
        }
    }
}
