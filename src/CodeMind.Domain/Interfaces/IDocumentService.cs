using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CodeMind.Domain.DTOs.Common;
using CodeMind.Domain.DTOs.Document;
using CodeMind.Domain.DTOs.Dashboard;

namespace CodeMind.Domain.Interfaces;

public interface IDocumentService
{
    Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType, string? model = "llama3", string? apiKey = null);
    Task<ApiResponse<ZipUploadResponseDto>> UploadAndQueueZipAsync(Stream zipStream, string archiveName, string? model = "llama3", string? apiKey = null);
    Task<ApiResponse<List<DocumentHistoryDto>>> GetDocumentHistoryAsync();
    Task<ApiResponse<List<ProjectFileDto>>> GetProjectDocumentsAsync(Guid projectId);
    Task<ApiResponse<DocumentReportDetailDto>> GetDocumentReportAsync(Guid id);
    Task<ApiResponse<DashboardStatsDto>> GetDashboardStatsAsync();
    Task<ApiResponse<DocumentExportReportDto>> ExportDocumentReportJsonAsync(Guid documentId);
    Task<ApiResponse<bool>> CancelDocumentAnalysisAsync(Guid documentId);
}
