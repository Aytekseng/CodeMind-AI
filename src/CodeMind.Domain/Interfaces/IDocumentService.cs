using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CodeMind.Domain.DTOs;

namespace CodeMind.Domain.Interfaces;

public interface IDocumentService
{
    Task<ApiResponse<object>> UploadAndQueueDocumentAsync(Stream fileStream, string fileName, string contentType);
    Task<ApiResponse<List<DocumentHistoryDto>>> GetDocumentHistoryAsync();
    Task<ApiResponse<DocumentReportDetailDto>> GetDocumentReportAsync(Guid id);
    Task<ApiResponse<DashboardStatsDto>> GetDashboardStatsAsync();
}
