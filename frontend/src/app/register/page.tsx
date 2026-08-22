"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Mail, Eye, EyeOff, Shield, Building2, User, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated } = useAuth()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [tenantName, setTenantName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
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

    if (!tenantName || !email || !password || !firstName || !lastName) {
      toast.error("Lütfen tüm zorunlu alanları doldurun.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Girdiğiniz şifreler birbiriyle eşleşmiyor.")
      return
    }

    if (password.length < 6) {
      toast.error("Şifreniz en az 6 karakter uzunluğunda olmalıdır.")
      return
    }

    try {
      setLoading(true)
      const res = await register({
        tenantName,
        firstName,
        lastName,
        email,
        password,
      })

      if (res.success) {
        toast.success(res.message || "Kayıt başarılı! Hesabınız oluşturuldu.")
        router.push("/dashboard")
      } else {
        toast.error(res.message || "Kayıt işlemi başarısız oldu.")
      }
    } catch {
      toast.error("Kayıt sırasında beklenmeyen bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-6 py-12">
      {/* Background glow accents */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg">
        {/* Card container */}
        <div className="rounded-2xl border border-white/10 bg-[#0d101a]/90 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-1">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#090a0f]">
                <Building2 className="h-6 w-6 text-cyan-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Yeni Şirket & Geliştirici Hesabı
            </h1>
            <p className="text-xs text-zinc-400">
              Kod denetimlerinizi izole bir şirket ortamında yönetmek için hemen kaydolun.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Şirket / Organizasyon Adı</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Örn: Acme Siber Güvenlik A.Ş."
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Names (Grid) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Ad</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adınız"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Soyad</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Soyadınız"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Kurumsal E-Posta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gelistirici@sirket.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Passwords (Grid) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Şifre Tekrar</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? "Gizle" : "Göster"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt Yapılıyor...
                </>
              ) : (
                <>
                  <span>Hesap Oluştur ve Başla</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer switcher */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-zinc-400">
            Zaten bir hesabınız var mı?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        </div>

        {/* Security Feature Badge */}
        <div className="mt-4 text-center">
          <Badge variant="outline" className="text-[11px] gap-1.5 py-1 px-3 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Otomatik Multi-Tenant Organizasyon Oluşturma</span>
          </Badge>
        </div>
      </div>
    </div>
  )
}
