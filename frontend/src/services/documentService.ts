import api from "@/services/apiClient"

/**
 * CodeMind AI - Document Service
 * 
 * C# Web API (DocumentController) ile iletişim kuran servis.
 */

export interface ApiResponse<T = any> {
  isSuccess: boolean
  message?: string
  error?: string | null
  errors?: string[] | null
  data?: T
}

export interface UploadResultData {
  documentId?: string
  objectKey?: string
}

/**
 * Tekil bir kod dosyasını C# Web API'ye (POST /api/Document/upload) gönderir.
 * 
 * @param file Kullanıcının seçtiği/sürüklediği dosya
 * @param onProgress Yükleme yüzdesi takip fonksiyonu (isteğe bağlı)
 * @returns ApiResponse formatında sunucu yanıtı
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
