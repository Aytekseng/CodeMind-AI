using CodeMind.Domain.DTOs;
using CodeMind.Domain.DTOs.Team;

namespace CodeMind.Domain.Interfaces;

public interface IPdfExportService
{
    byte[] GenerateDocumentReportPdf(DocumentExportReportDto report);
    byte[] GenerateCompanyAuditReportPdf(CompanyExportDto companyData);
}
