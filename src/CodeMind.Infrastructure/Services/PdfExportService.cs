using System;
using System.Linq;
using CodeMind.Domain.DTOs;
using CodeMind.Domain.DTOs.Team;
using CodeMind.Domain.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CodeMind.Infrastructure.Services;

public class PdfExportService : IPdfExportService
{
    static PdfExportService()
    {
        // QuestPDF Açık Kaynak / Topluluk lisansı
        QuestPDF.Settings.License = LicenseType.Community;
        QuestPDF.Settings.UseSystemFonts = true;
        QuestPDF.Settings.ThrowOnMissingFontFamilies = false;
    }

    public byte[] GenerateDocumentReportPdf(DocumentExportReportDto report)
    {
        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontFamily("Segoe UI").FontSize(10).FontColor(Colors.Grey.Darken3));

                // Header
                page.Header().Element(headerContainer =>
                {
                    headerContainer.BorderBottom(1).BorderColor(Colors.Grey.Lighten1).PaddingBottom(12).Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("🛡️ CodeMind-AI Security Platform")
                                .FontSize(16).Bold().FontColor(Colors.Cyan.Darken2);
                            col.Item().Text("Otomatik Kaynak Kod Güvenlik Denetim Raporu")
                                .FontSize(11).Medium().FontColor(Colors.Grey.Darken2);
                        });

                        row.RelativeItem().AlignRight().Column(col =>
                        {
                            col.Item().Text($"Şirket: {report.Metadata.CompanyName}").FontSize(10).SemiBold();
                            col.Item().Text($"Proje: {report.Metadata.ProjectName ?? "Genel Depo"}").FontSize(9).FontColor(Colors.Grey.Darken1);
                            col.Item().Text($"Tarih: {report.Metadata.ExportedAt:dd.MM.yyyy HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Medium);
                        });
                    });
                });

                // Content
                page.Content().PaddingVertical(15).Column(column =>
                {
                    column.Spacing(12);

                    // 1. Özet Bilgi Kartları
                    column.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("İncelenen Dosya:").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(report.Document.FileName).Bold().FontSize(10);
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Programlama Dili:").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(report.Document.Language).Bold().FontSize(10);
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Kullanılan Yapay Zeka:").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(report.Analysis.ModelUsed).Bold().FontSize(10).FontColor(Colors.Blue.Darken2);
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Zafiyet Seviyesi:").FontSize(8).FontColor(Colors.Grey.Darken1);
                            var sev = report.Analysis.Severity ?? "Güvenli";
                            var sevColor = sev.Contains("Kritik", StringComparison.OrdinalIgnoreCase) ? Colors.Red.Darken1 :
                                           sev.Contains("Yüksek", StringComparison.OrdinalIgnoreCase) ? Colors.Orange.Darken1 :
                                           sev.Contains("Orta", StringComparison.OrdinalIgnoreCase) ? Colors.Amber.Darken2 :
                                           Colors.Green.Darken1;

                            c.Item().Text(sev).Bold().FontSize(10).FontColor(sevColor);
                        });

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Güvenlik Skoru:").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text($"{report.Analysis.Score} / 100").Bold().FontSize(10).FontColor(Colors.Green.Darken2);
                        });
                    });

                    // 2. Yapay Zeka Güvenlik Bulguları
                    column.Item().Text("1. 🛡️ Yapay Zeka Güvenlik Bulguları ve Çözüm Eylem Planı")
                        .Bold().FontSize(12).FontColor(Colors.Blue.Darken3);

                    column.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.White).Padding(12).Column(c =>
                    {
                        var suggestion = string.IsNullOrWhiteSpace(report.Analysis.AiSuggestion)
                            ? "Herhangi bir güvenlik açığı tespit edilmedi."
                            : report.Analysis.AiSuggestion;

                        c.Item().Text(suggestion).FontSize(9.5f).LineHeight(1.4f);
                    });

                    // 3. Kaynak Kod
                    if (!string.IsNullOrWhiteSpace(report.Document.OriginalCode))
                    {
                        column.Item().Text("2. 📄 Analiz Edilen Kaynak Kod")
                            .Bold().FontSize(12).FontColor(Colors.Blue.Darken3);

                        column.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten5).Padding(10).Column(c =>
                        {
                            c.Item().Text(report.Document.OriginalCode)
                                .FontFamily("Consolas")
                                .FontSize(8)
                                .LineHeight(1.2f)
                                .FontColor(Colors.Grey.Darken4);
                        });
                    }
                });

                // Footer
                page.Footer().BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text("CodeMind-AI Siber Güvenlik ve Kod Denetim Sistemi • Gizli & Kurumsal Rapor")
                        .FontSize(8).FontColor(Colors.Grey.Medium);

                    row.RelativeItem().AlignRight().Text(text =>
                    {
                        text.Span("Sayfa ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }

    public byte[] GenerateCompanyAuditReportPdf(CompanyExportDto companyData)
    {
        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontFamily("Segoe UI").FontSize(10).FontColor(Colors.Grey.Darken3));

                // Header
                page.Header().BorderBottom(1).BorderColor(Colors.Grey.Lighten1).PaddingBottom(12).Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("🏢 CodeMind-AI Kurumsal Güvenlik Denetim Özeti")
                            .FontSize(16).Bold().FontColor(Colors.Cyan.Darken2);
                        col.Item().Text($"Şirket / Çalışma Alanı: {companyData.Company.Name}")
                            .FontSize(11).Medium().FontColor(Colors.Grey.Darken2);
                    });

                    row.RelativeItem().AlignRight().Column(col =>
                    {
                        col.Item().Text($"Üyelik: {companyData.Company.SubscriptionTier} Plan").FontSize(10).SemiBold();
                        col.Item().Text($"Hazırlayan: {companyData.ExportMetadata.ExportedBy}").FontSize(8).FontColor(Colors.Grey.Darken1);
                        col.Item().Text($"Rapor Tarihi: {companyData.ExportMetadata.ExportedAt:dd.MM.yyyy HH:mm} UTC").FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });

                // Content
                page.Content().PaddingVertical(15).Column(column =>
                {
                    column.Spacing(14);

                    // 1. İstatistik Özet Kartları
                    column.Item().Text("📊 Genel Güvenlik ve Analiz İstatistikleri")
                        .Bold().FontSize(12).FontColor(Colors.Blue.Darken3);

                    column.Item().Row(row =>
                    {
                        row.Spacing(8);

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("Toplam Proje").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(companyData.Statistics.TotalProjects.ToString()).Bold().FontSize(14).FontColor(Colors.Blue.Darken2);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                        {
                            c.Item().Text("Toplam Dosya").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(companyData.Statistics.TotalDocuments.ToString()).Bold().FontSize(14).FontColor(Colors.Cyan.Darken2);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Red.Lighten3).Background(Colors.Red.Lighten5).Padding(8).Column(c =>
                        {
                            c.Item().Text("Kritik Açıklar").FontSize(8).FontColor(Colors.Red.Darken1);
                            c.Item().Text(companyData.Statistics.CriticalCount.ToString()).Bold().FontSize(14).FontColor(Colors.Red.Darken2);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Orange.Lighten3).Background(Colors.Orange.Lighten5).Padding(8).Column(c =>
                        {
                            c.Item().Text("Yüksek Açıklar").FontSize(8).FontColor(Colors.Orange.Darken1);
                            c.Item().Text(companyData.Statistics.HighCount.ToString()).Bold().FontSize(14).FontColor(Colors.Orange.Darken2);
                        });

                        row.RelativeItem().Border(1).BorderColor(Colors.Green.Lighten3).Background(Colors.Green.Lighten5).Padding(8).Column(c =>
                        {
                            c.Item().Text("Temiz / Düşük").FontSize(8).FontColor(Colors.Green.Darken1);
                            c.Item().Text(companyData.Statistics.LowCount.ToString()).Bold().FontSize(14).FontColor(Colors.Green.Darken2);
                        });
                    });

                    // 2. Kayıtlı Takım Üyeleri
                    column.Item().Text($"👥 Kayıtlı Ekip Üyeleri ({companyData.Users.Count})")
                        .Bold().FontSize(12).FontColor(Colors.Blue.Darken3);

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Ad Soyad").Bold().FontSize(9);
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("E-Posta").Bold().FontSize(9);
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Rol").Bold().FontSize(9);
                        });

                        foreach (var u in companyData.Users)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text($"{u.FirstName} {u.LastName}").FontSize(8.5f);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text(u.Email).FontSize(8.5f);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text(u.Role).FontSize(8.5f).Bold();
                        }
                    });

                    // 3. Projeler ve Taranan Dosyalar Tablosu
                    column.Item().Text($"📁 Projeler ve Taranan Dosyalar ({companyData.Statistics.TotalDocuments} Dosya)")
                        .Bold().FontSize(12).FontColor(Colors.Blue.Darken3);

                    if (companyData.Projects.Any())
                    {
                        column.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(4);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(3);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Proje").Bold().FontSize(9);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Dosya Adı").Bold().FontSize(9);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Zafiyet").Bold().FontSize(9);
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Kullanılan Model").Bold().FontSize(9);
                            });

                            foreach (var p in companyData.Projects)
                            {
                                foreach (var d in p.Documents)
                                {
                                    var latestReport = d.AnalysisReports.FirstOrDefault();
                                    var sev = latestReport?.Severity ?? "İnceleniyor";
                                    var model = latestReport?.ModelUsed ?? "Llama 3";

                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(p.Name).FontSize(8);
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(d.FileName).FontSize(8);
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(sev).FontSize(8).Bold();
                                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(model).FontSize(8);
                                }
                            }
                        });
                    }
                    else
                    {
                        column.Item().Text("Henüz sisteme yüklenmiş proje veya kod dosyası bulunmamaktadır.").Italic().FontSize(9);
                    }
                });

                // Footer
                page.Footer().BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text("CodeMind-AI Güvenlik Platformu • Yönetim Kurulu ve Denetim Özeti")
                        .FontSize(8).FontColor(Colors.Grey.Medium);

                    row.RelativeItem().AlignRight().Text(text =>
                    {
                        text.Span("Sayfa ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }
}
