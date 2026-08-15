using Microsoft.Extensions.Configuration;
using Minio;
using Minio.DataModel.Args;

public class MinIOService : IMinIOService
{
    private readonly IMinioClient _minioClient;
    private readonly string _bucketName = string.Empty;

    public MinIOService(IConfiguration config)
    {
        var settings = config.GetSection("MinIOSettings");
        _bucketName = settings["BucketName"];

        _minioClient = new MinioClient()
            .WithEndpoint(settings["Endpoint"])
            .WithCredentials(settings["AccessKey"],
            settings["SecretKey"])
            .Build();
            
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        bool found = await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucketName));
        if(!found)
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
}