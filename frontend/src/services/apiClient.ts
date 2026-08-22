import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

export interface ApiResponse<T> {
  data?: T
  isSuccess: boolean
  message?: string
  errors?: string[]
  error?: string
}

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
      const status = error.response.status
      const data: any = error.response.data
      console.error(`[API Hatası] ${status}:`, data?.message || error.message)
    } else if (error.request) {
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
