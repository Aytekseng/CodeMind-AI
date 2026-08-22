using System;
using System.IO;
using System.Threading.Tasks;
using CodeMind.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Minio;
using Minio.DataModel.Args;

namespace CodeMind.Infrastructure.Services;

public class MinIOService : IMinIOService
{
    private readonly IMinioClient _minioClient;
    private readonly string _bucketName = string.Empty;

    public MinIOService(IConfiguration config)
    {
        var settings = config.GetSection("MinIOSettings");
        _bucketName = settings["BucketName"] ?? "codemind-uploads";

        _minioClient = new MinioClient()
            .WithEndpoint(settings["Endpoint"] ?? "localhost:9000")
            .WithCredentials(settings["AccessKey"] ?? "admin", settings["SecretKey"] ?? "adminpassword")
            .Build();
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        bool found = await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucketName));
        if (!found)
            await _minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucketName));

        string objectName = $"{Guid.NewGuid()}_{fileName}";
        await _minioClient.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectName)
            .WithStreamData(fileStream)
            .WithObjectSize(fileStream.Length)
            .WithContentType(contentType));

        return objectName;
    }

    public async Task<string> GetFileTextAsync(string objectName)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await _minioClient.GetObjectAsync(new GetObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectName)
                .WithCallbackStream(stream => stream.CopyTo(memoryStream)));

            memoryStream.Position = 0;
            using var reader = new StreamReader(memoryStream);
            return await reader.ReadToEndAsync();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MinIO GetFileText Hatası] {ex.Message}");
            return string.Empty;
        }
    }
}