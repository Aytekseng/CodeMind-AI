/**
 * CodeMind AI - Document Service
 * 
 * Bu dosya, C# Web API'deki DocumentController uç noktalarıyla iletişim kuracak
 * istemci servisidir. Entegrasyonu isteğinize göre özelleştirebilirsiniz.
 */

export interface ApiResponse<T = any> {
  isSuccess: boolean
  message: string
  error?: string | null
  data?: T
}

export interface UploadResultData {
  documentId?: string
  fileName?: string
  objectKey?: string
  status?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

/**
 * Tekil bir kod dosyasını C# Web API'ye (POST /api/Document/upload) gönderir.
 * 
 * @param file Kullanıcının seçtiği/sürüklediği dosya
 * @returns ApiResponse formatında sunucu yanıtı
 */
export async function uploadDocumentAsync(file: File): Promise<ApiResponse<string>> {
  try {
    // -------------------------------------------------------------
    // TODO: Entegrasyonunuzu buraya yazabilirsiniz.
    // Örnek Form Data Gönderimi:
    // -------------------------------------------------------------
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_BASE_URL}/api/Document/upload`, {
      method: "POST",
      body: formData,
      // Not: FormData kullanırken 'Content-Type' header'ını tarayıcı otomatik ayarlar.
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      return {
        isSuccess: false,
        message: errorData?.message || `Sunucu hatası: ${response.statusText}`,
        error: errorData?.error || "Dosya yüklenemedi.",
      }
    }

    const result = await response.json()
    return result
    // -------------------------------------------------------------

  } catch (error: any) {
    console.error("Dosya yükleme hatası:", error)
    return {
      isSuccess: false,
      message: "Sunucuya bağlanırken bir hata oluştu.",
      error: error?.message || "Bağlantı hatası",
    }
  }
}
