"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authService, AuthResponseData, LoginPayload, RegisterPayload } from "@/services/authService"

interface AuthContextType {
  user: AuthResponseData | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<{ success: boolean; message?: string }>
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponseData | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Initialize auth state from local storage on mount
  useEffect(() => {
    const storedToken = authService.getStoredToken()
    const storedUser = authService.getStoredUser()

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)

      // Optionally refresh user profile from backend
      authService.getCurrentUser()
        .then((res) => {
          if (res.isSuccess && res.data) {
            const updatedUser = { ...res.data, token: storedToken }
            setUser(updatedUser)
            authService.setSession(storedToken, updatedUser)
          }
        })
        .catch(() => {
          // Token expired or invalid
          console.warn("[Auth] Oturum süresi dolmuş olabilir.")
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      setIsLoading(true)
      const res = await authService.login(payload)
      if (res.isSuccess && res.data) {
        setToken(res.data.token)
        setUser(res.data)
        authService.setSession(res.data.token, res.data)
        return { success: true, message: res.message || "Giriş başarılı!" }
      }
      return { success: false, message: res.message || "Giriş başarısız oldu." }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Giriş yapılırken sunucu hatası oluştu."
      return { success: false, message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      setIsLoading(true)
      const res = await authService.register(payload)
      if (res.isSuccess && res.data) {
        setToken(res.data.token)
        setUser(res.data)
        authService.setSession(res.data.token, res.data)
        return { success: true, message: res.message || "Kayıt başarıyla tamamlandı!" }
      }
      return { success: false, message: res.message || "Kayıt başarısız oldu." }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Kayıt sırasında sunucu hatası oluştu."
      return { success: false, message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser()
      if (res.isSuccess && res.data && token) {
        const updated = { ...res.data, token }
        setUser(updated)
        authService.setSession(token, updated)
      }
    } catch {
      // ignore
    }
  }, [token])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
