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
}

/**
 * Dosya veya .ZIP arşivi yükleme servisi (POST /api/Document/upload)
 */
export async function uploadDocumentAsync(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<UploadResultData>> {
  const formData = new FormData()
  formData.append("file", file)

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
