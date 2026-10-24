"use client"
import { normalizeError } from "@/lib/errors"

import { clearApiKeys } from "@/lib/apiKeys"
import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authService, AuthResponseData, LoginPayload, RegisterPayload, UpdateProfilePayload } from "@/services/authService"

interface AuthContextType {
  user: AuthResponseData | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<{ success: boolean; message?: string }>
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string }>
  updateProfile: (payload: UpdateProfilePayload) => Promise<{ success: boolean; message?: string }>
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
    let active = true
    clearApiKeys()
    const storedToken = authService.getStoredToken()
    const storedUser = authService.getStoredUser()

    if (storedToken && storedUser) {


      // Optionally refresh user profile from backend
      authService.getCurrentUser()
        .then((res) => {
          if (active && authService.getStoredToken() === storedToken && res.isSuccess && res.data) {
            const updatedUser = { ...res.data, token: storedToken }
            setToken(storedToken)
            setUser(updatedUser)
            authService.setSession(storedToken, updatedUser)
          }
        })
        .catch(() => {
          // Do not clear a newer session after an old request fails.
          if (!active || authService.getStoredToken() !== storedToken) return
          authService.clearSession()
          setToken(null)
          setUser(null)
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
    } else {
      queueMicrotask(() => setIsLoading(false))
    }
    const expire = () => { authService.clearSession(); setToken(null); setUser(null) }
    window.addEventListener("codemind-session-expired", expire)
    return () => { active = false; window.removeEventListener("codemind-session-expired", expire) }
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
    } catch (caught: unknown) {
      const err = normalizeError(caught)
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
    } catch (caught: unknown) {
      const err = normalizeError(caught)
      const errMsg = err.response?.data?.message || err.message || "Kayıt sırasında sunucu hatası oluştu."
      return { success: false, message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    try {
      setIsLoading(true)
      const res = await authService.updateProfile(payload)
      if (res.isSuccess && res.data) {
        const updatedToken = res.data.token || token
        if (updatedToken) {
          setToken(updatedToken)
          setUser(res.data)
          authService.setSession(updatedToken, res.data)
        }
        return { success: true, message: res.message || "Profil başarıyla güncellendi!" }
      }
      return { success: false, message: res.message || "Profil güncellenemedi." }
    } catch (caught: unknown) {
      const err = normalizeError(caught)
      const errMsg = err.response?.data?.message || err.message || "Güncelleme sırasında hata oluştu."
      return { success: false, message: errMsg }
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const logout = useCallback(() => {
    authService.clearSession()
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getCurrentUser()
      if (res.isSuccess && res.data && token && authService.getStoredToken() === token) {
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
        updateProfile,
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
