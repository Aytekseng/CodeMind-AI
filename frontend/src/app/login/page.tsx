"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Mail, Eye, EyeOff, Shield, Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Lütfen e-posta ve şifre alanlarını doldurun.")
      return
    }

    try {
      setLoading(true)
      const res = await login({ email, password })
      if (res.success) {
        toast.success(res.message || "Giriş başarılı! Yönlendiriliyorsunuz...")
        router.push("/dashboard")
      } else {
        toast.error(res.message || "E-posta veya şifre hatalı.")
      }
    } catch {
      toast.error("Giriş işlemi sırasında beklenmeyen bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-6">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card container */}
        <div className="rounded-2xl border border-white/10 bg-[#0d101a]/90 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-2">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#090a0f]">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              CodeMind <span className="text-cyan-400">AI</span> Giriş
            </h1>
            <p className="text-xs text-zinc-400">
              Şirket ve kullanıcı hesabınıza giriş yaparak izole güvenlik raporlarınıza erişin.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Şifre</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer switcher */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-zinc-400">
            Hesabınız yok mu?{" "}
            <Link
              href="/register"
              className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Yeni Şirket Hesabı Aç
            </Link>
          </div>
        </div>

        {/* Multi-Tenant Security Note */}
        <div className="mt-4 text-center">
          <Badge variant="outline" className="text-[11px] gap-1.5 py-1 px-3 border-emerald-500/30 bg-emerald-500/5 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>PostgreSQL Row-Level Security (RLS) ile Veri İzolasyonu</span>
          </Badge>
        </div>
      </div>
    </div>
  )
}
