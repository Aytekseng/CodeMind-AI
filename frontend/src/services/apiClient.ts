import axios, { AxiosInstance, AxiosRequestConfig } from "axios"

export interface ApiResponse<T> {
  data?: T
  isSuccess: boolean
  message?: string
  errors?: string[]
  error?: string
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5083"

// Standart JSON istekleri için Axios örneği
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// İstek Interceptor'ı (Token ekleme)
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Yanıt Interceptor'ı
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data
    console.warn(`[API Durumu ${status || "Network"}]`, data?.message || error.message)
    return Promise.reject(error)
  }
)

/**
 * Tip güvenli ve pratik API İstemcisi
 */
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.get<T>(url, config)
    return response.data
  },

  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, config)
    return response.data
  },

  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, config)
    return response.data
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, config)
    return response.data
  },

  /**
   * Dosya Yükleme (Doğrudan Native XHR ile tarayıcı boundary'si garanti edilir)
   */
  upload: async <T>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`

      xhr.open("POST", fullUrl, true)
      xhr.withCredentials = true

      // JWT Token
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`)
        }
      }

      // Yükleme ilerleme takibi
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total)
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText)
            resolve(parsed)
          } catch {
            resolve(xhr.responseText as any)
          }
        } else {
          try {
            const errorJson = JSON.parse(xhr.responseText)
            resolve(errorJson as any)
          } catch {
            reject(new Error(`Yükleme başarısız (HTTP ${xhr.status}): ${xhr.statusText}`))
          }
        }
      }

      xhr.onerror = () => {
        reject(new Error("Sunucuya (http://localhost:5083) ulaşılamadı. Lütfen .NET API'nin çalıştığından emin olun."))
      }

      // FormData gönder (Tarayıcı multipart/form-data; boundary=... başlığını otomatik ekler)
      xhr.send(formData)
    })
  },
}

export default api
export { axiosInstance, BASE_URL }
