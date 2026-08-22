import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

/**
 * CodeMind AI - Merkezi API İstemcisi
 * 
 * Tüm HTTP isteklerini (GET, POST, PUT, DELETE ve Dosya Yükleme) 
 * tek bir merkezden yönetir. Otomatik JWT token ekleme ve merkezi 
 * hata yönetimi (interceptors) içerir.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5083"

// Axios örneğini yapılandır
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 saniye zaman aşımı
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// İstek Interceptor'ı (Her istek öncesi çalışır)
axiosInstance.interceptors.request.use(
  (config) => {
    // Tarayıcı ortamındaysak ve localStorage'da token varsa Authorization başlığına ekle
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Yanıt Interceptor'ı (Sunucudan gelen her yanıtta çalışır)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      // Sunucu hata koduyla yanıt verdi (4xx, 5xx)
      const status = error.response.status
      const data: any = error.response.data

      console.error(`[API Hatası] ${status}:`, data?.message || error.message)

      // 401 Unauthorized durumunda oturumu sonlandırma örneği
      if (status === 401 && typeof window !== "undefined") {
        // localStorage.removeItem("token")
        // window.location.href = "/login"
      }
    } else if (error.request) {
      // İstek yapıldı ama yanıt alınamadı (Network hatası / Backend kapalı)
      console.error("[API Network Hatası] Sunucuya ulaşılamıyor.")
    } else {
      console.error("[API İstek Hatası]", error.message)
    }

    return Promise.reject(error)
  }
)

/**
 * Tip güvenli ve pratik API İstemcisi
 */
export const api = {
  /**
   * GET İsteği
   */
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.get<T>(url, config)
    return response.data
  },

  /**
   * POST İsteği (JSON Body)
   */
  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, config)
    return response.data
  },

  /**
   * PUT İsteği
   */
  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, config)
    return response.data
  },

  /**
   * DELETE İsteği
   */
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, config)
    return response.data
  },

  /**
   * Dosya Yükleme (Multipart / FormData) İsteği
   * 
   * @param url Uç nokta yolu (örn: '/api/Document/upload')
   * @param formData Gönderilecek FormData nesnesi
   * @param onProgress Yükleme yüzdesi geri bildirimi için callback
   */
  upload: async <T>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<T> => {
    const response = await axiosInstance.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      },
    })
    return response.data
  },
}

export default api
export { axiosInstance }
