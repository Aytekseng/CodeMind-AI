import api, { ApiResponse } from "./apiClient"

export interface UserProfile {
  userId: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantName: string
  token?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  tenantName: string
  password: string
}

export interface AuthResponseData {
  token: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantName: string
  userId: string
  tenantId: string
}

export const authService = {
  login: async (payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> => {
    return await api.post<ApiResponse<AuthResponseData>>("/api/auth/login", payload)
  },

  register: async (payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> => {
    return await api.post<ApiResponse<AuthResponseData>>("/api/auth/register", payload)
  },

  getCurrentUser: async (): Promise<ApiResponse<AuthResponseData>> => {
    return await api.get<ApiResponse<AuthResponseData>>("/api/auth/me")
  },

  setSession: (token: string, user: AuthResponseData) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
    }
  },

  clearSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("accessToken")
      localStorage.removeItem("user")
    }
  },

  getStoredToken: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || localStorage.getItem("accessToken")
    }
    return null
  },

  getStoredUser: (): AuthResponseData | null => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        try {
          return JSON.parse(userStr)
        } catch {
          return null
        }
      }
    }
    return null
  }
}
