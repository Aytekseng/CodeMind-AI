"use client"

import * as React from "react"
import { ShieldAlert, KeyRound, Lock, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export function MandatoryPasswordChangeModal() {
  const { user, updateProfile } = useAuth()

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Yalnızca kullanıcı giriş yapmışsa ve mustChangePassword true ise göster
  if (!user || !user.mustChangePassword) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentPassword) {
      setError("Lütfen yöneticinizden aldığınız geçici şifreyi girin.")
      return
    }

    if (newPassword.length < 6) {
      setError("Yeni şifreniz en az 6 karakter uzunluğunda olmalıdır.")
      return
    }

    if (newPassword === currentPassword) {
      setError("Yeni şifreniz geçici şifreniz ile aynı olamaz. Lütfen farklı ve güçlü bir şifre seçin.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler birbiriyle uyuşmuyor.")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        currentPassword,
        newPassword
      })

      if (res.success) {
        toast.success("Şifreniz başarıyla güncellendi! Yeni şifreniz aktif edildi.", {
          description: "Artık yeni şifrenizle güvenle çalışabilirsiniz. Geçici şifreniz iptal edilmiştir."
        })
      } else {
        setError(res.message || "Şifre güncellenirken bir hata oluştu.")
      }
    } catch (err: any) {
      setError(err?.message || "Sunucuyla iletişim kurulurken bir hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0c0d14] p-7 shadow-2xl shadow-amber-950/40 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              İlk Giriş: Zorunlu Şifre Değişimi
            </h2>
            <p className="text-xs text-amber-400/90 font-medium">
              Geçici şifrenizi kalıcı ve güvenli bir şifreyle yenileyin
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 mb-5 text-xs text-zinc-300 leading-relaxed">
          <p className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Hesabınız bir yönetici tarafından geçici şifre ile oluşturulmuştur. Kurumsal güvenlik politikası gereği devam edebilmek için geçici şifrenizi hemen değiştirmeniz zorunludur.
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Mevcut Geçici Şifreniz
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Yöneticinizin verdiği geçici şifre"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <Lock className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Yeni Şifreniz
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifreyi onaylayın"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs py-2.5 gap-2 shadow-lg shadow-amber-950/50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Şifre Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Yeni Şifremi Kaydet ve Sisteme Başla</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
