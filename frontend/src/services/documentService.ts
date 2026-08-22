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

export interface UploadResponseData {
  objectKey: string
  documentId: string
}

/**
 * Dosya yükleme servisi (POST /api/Document/upload)
 */
export async function uploadDocumentAsync(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<UploadResponseData>> {
  const formData = new FormData()
  formData.append("file", file)

  return await api.upload<ApiResponse<UploadResponseData>>(
    "/api/Document/upload",
    formData,
    onProgress
  )
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
