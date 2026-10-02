import { api, ApiResponse } from "@/services/apiClient"

export type { ApiResponse }

export interface DocumentHistoryItem {
  id: string
  fileName: string
  language: string
  createdAt: string
  status: string
  severity: string
  score: number
  findingsCount: number
  latestAiSuggestion?: string
  projectId?: string
  projectName?: string
  modelUsed?: string
}

export interface DocumentReportDetail {
  documentId: string
  fileName: string
  language: string
  status: string
  createdAt: string
  severity: string
  score: number
  aiSuggestion: string
  originalCode: string
  vulnerableLines: number[]
  projectId?: string
  projectName?: string
  modelUsed?: string
}

export interface DashboardStats {
  totalDocuments: number
  averageScore: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  recentDocuments: DocumentHistoryItem[]
}

export interface SingleUploadResponseData {
  objectKey: string
  documentId: string
}

export interface ZipUploadResponseData {
  projectId: string
  projectName: string
  batchId: string
  totalExtractedFiles: number
  extractedFiles: string[]
  documentIds: string[]
}

export type UploadResultData = SingleUploadResponseData & Partial<ZipUploadResponseData>

export interface ProjectFile {
  documentId: string
  fileName: string
  relativePath: string
  language: string
  status: string
  severity: string
  score: number
  modelUsed?: string
}

/**
 * Dosya veya .ZIP arşivi yükleme servisi (POST /api/Document/upload)
 */
export async function uploadDocumentAsync(
  file: File,
  model: string = "llama3",
  apiKey?: string,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<UploadResultData>> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("model", model)
  if (apiKey) {
    formData.append("apiKey", apiKey)
  }

  return await api.upload<ApiResponse<UploadResultData>>(
    "/api/Document/upload",
    formData,
    onProgress
  )
}

/**
 * Bir projeye ait tüm taranan dosyaları getirir (GET /api/Document/project/{projectId}/files)
 */
export async function getProjectFilesAsync(
  projectId: string
): Promise<ApiResponse<ProjectFile[]>> {
  return await api.get<ApiResponse<ProjectFile[]>>(`/api/Document/project/${projectId}/files`)
}

/**
 * Geçmiş analiz edilen dosyaları getirir (GET /api/Document/history)
 */
export async function getHistoryAsync(): Promise<ApiResponse<DocumentHistoryItem[]>> {
  return await api.get<ApiResponse<DocumentHistoryItem[]>>("/api/Document/history")
}

/**
 * Belirli bir dokümanın detaylı analiz raporunu getirir (GET /api/Document/{id}/report)
 */
export async function getDocumentReportAsync(
  id: string
): Promise<ApiResponse<DocumentReportDetail>> {
  return await api.get<ApiResponse<DocumentReportDetail>>(`/api/Document/${id}/report`)
}

/**
 * Dashboard özet istatistiklerini getirir (GET /api/Document/stats)
 */
export async function getDashboardStatsAsync(): Promise<ApiResponse<DashboardStats>> {
  return await api.get<ApiResponse<DashboardStats>>("/api/Document/stats")
}

/**
 * Belirli bir dokümanın güvenlik denetim raporunu JSON dosyası olarak indirir
 */
export async function exportDocumentReportJsonAsync(
  documentId: string,
  fileName?: string
): Promise<string> {
  const safeName = (fileName || documentId).replace(/[^a-zA-Z0-9._-]/g, "_")
  return await api.downloadFile(
    `/api/Document/${documentId}/export/json`,
    `codemind-report-${safeName}.json`
  )
}

/**
 * Belirli bir dokümanın güvenlik denetim raporunu kurumsal PDF dosyası olarak indirir (Türkçe karakter destekli)
 */
export async function exportDocumentReportPdfAsync(
  documentId: string,
  fileName?: string
): Promise<string> {
  const safeName = (fileName || documentId).replace(/[^a-zA-Z0-9._-]/g, "_")
  return await api.downloadFile(
    `/api/Document/${documentId}/export/pdf`,
    `codemind-report-${safeName}.pdf`
  )
}

/**
 * İşlemde olan bir doküman analizini kullanıcı isteğiyle iptal eder
 */
export async function cancelDocumentAnalysisAsync(documentId: string): Promise<ApiResponse<boolean>> {
  return await api.post<ApiResponse<boolean>>(`/api/Document/${documentId}/cancel`)
}

/**
 * Belirli bir dokümanın analiz raporunu kurumsal formatta yazdırır veya PDF olarak dışa aktarır
 */
export function printDocumentReport(report: DocumentReportDetail, companyName?: string): void {
  if (typeof window === "undefined") return
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  const sevLower = report.severity?.toLowerCase() || ""
  const severityColor = sevLower.includes("kritik")
    ? "#e11d48"
    : sevLower.includes("yüksek")
    ? "#ea580c"
    : sevLower.includes("orta")
    ? "#d97706"
    : "#059669"

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Güvenlik Denetim Raporu - ${report.fileName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 32px;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0284c7;
    }
    .title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
    }
    .meta-table .label {
      background: #f8fafc;
      font-weight: 600;
      width: 25%;
      color: #475569;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      color: #ffffff;
      font-weight: bold;
      font-size: 12px;
      background: ${severityColor};
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }
    .suggestion-box {
      background: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 16px;
      border-radius: 4px;
      font-size: 13px;
      white-space: pre-wrap;
      font-family: inherit;
      color: #0f172a;
    }
    .code-box {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 6px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 400px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">🛡️ CodeMind-AI Security Platform</div>
      <div class="title">Otomatik Kaynak Kod Güvenlik Denetim Raporu</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      <div><strong>Tarih:</strong> ${new Date().toLocaleDateString("tr-TR")}</div>
      <div><strong>Şirket:</strong> ${companyName || "CodeMind Workspace"}</div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Dosya Adı</td>
      <td><strong>${report.fileName}</strong></td>
      <td class="label">Proje</td>
      <td>${report.projectName || "-"}</td>
    </tr>
    <tr>
      <td class="label">Programlama Dili</td>
      <td>${report.language?.toUpperCase() || "Bilinmiyor"}</td>
      <td class="label">Kullanılan Yapay Zeka</td>
      <td>${report.modelUsed || "Llama 3"}</td>
    </tr>
    <tr>
      <td class="label">Zafiyet Seviyesi</td>
      <td><span class="badge">${report.severity || "Güvenli"}</span></td>
      <td class="label">Güvenlik Skoru</td>
      <td><strong>${report.score ?? 85} / 100</strong></td>
    </tr>
  </table>

  <div class="section-title">🛠️ Yapay Zeka Denetim Bulguları ve Çözüm Planı</div>
  <div class="suggestion-box">${(report.aiSuggestion || "Herhangi bir bulgu yok.")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</div>

  <div class="section-title">📄 Analiz Edilen Kaynak Kod</div>
  <pre class="code-box">${(report.originalCode || "// Kaynak kod içeriği bulunamadı.")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>

  <div class="footer">
    Bu rapor CodeMind-AI platformu tarafından otomatik üretilmiştir. Detaylar ve interaktif inceleme için web dashboard'unu ziyaret edin.
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}
