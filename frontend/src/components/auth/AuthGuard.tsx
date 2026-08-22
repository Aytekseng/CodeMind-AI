"use client"

import React from "react"
import Link from "next/link"
import { Lock, ShieldAlert, LogIn, UserPlus, ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"

interface AuthGuardProps {
  children: React.ReactNode
  pageTitle?: string
  pageDescription?: string
}

export function AuthGuard({
  children,
  pageTitle = "Güvenlik & Analiz Alanı",
  pageDescription = "Bu sayfadaki analiz raporlarını, şirket arşivini ve dashboard metriklerini görüntülemek için oturum açmalısınız.",
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-xs text-zinc-400 font-mono">Oturum bilgileri doğrulanıyor...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center p-6">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d101a]/95 p-8 text-center shadow-2xl backdrop-blur-2xl space-y-6">
          {/* Lock Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-[11px] gap-1.5 py-1 px-3 border-rose-500/30 bg-rose-500/5 text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>Yetkili Erişim Gerekli</span>
            </Badge>

            <h2 className="text-xl font-bold text-white tracking-tight">
              {pageTitle}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              {pageDescription}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <LogIn className="h-4 w-4" />
                <span>Giriş Yap</span>
              </Button>
            </Link>

            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2 border-white/10 hover:border-cyan-500/40">
                <UserPlus className="h-4 w-4 text-cyan-400" />
                <span>Kayıt Ol</span>
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-white/5">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Ana Sayfaya Dön</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
