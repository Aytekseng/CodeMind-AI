"use client"

import * as React from "react"
import {
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  Save,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

export function ProfileSettingsCard() {
  const { user, updateProfile } = useAuth()

  // Form states
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Sync state when user profile loads
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setEmail(user.email || "")
    }
  }, [user])

  if (!user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Lütfen ad ve soyad alanlarını doldurun.")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Lütfen geçerli bir e-posta adresi girin.")
      return
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        toast.error("Şifrenizi güncellemek için lütfen mevcut şifrenizi girin.")
        return
      }
      if (!newPassword) {
        toast.error("Lütfen yeni şifrenizi girin.")
        return
      }
      if (newPassword.length < 6) {
        toast.error("Yeni şifreniz en az 6 karakter olmalıdır.")
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("Yeni şifreler birbiriyle eşleşmiyor.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      }

      if (isChangingPassword && newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await updateProfile(payload)

      if (res.success) {
        toast.success(res.message || "Profil bilgileriniz başarıyla güncellendi.")
        // Reset password fields
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setIsChangingPassword(false)
      } else {
        toast.error(res.message || "Profil güncellenirken bir hata oluştu.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Sunucuyla iletişim kurulurken beklenmeyen bir hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setEmail(user.email || "")
      setPhoneNumber("")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setIsChangingPassword(false)
    }
  }

  return (
    <Card className="glass-panel border-white/10 shadow-lg">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Hesap & Profil Bilgileri
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Kişisel bilgilerinizi ve giriş kimlik bilgilerinizi güvenle güncelleyin.
              </CardDescription>
            </div>
          </div>

          {/* User badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-300 gap-1 py-1">
              <Building2 className="h-3 w-3" />
              <span>{user.tenantName}</span>
            </Badge>
            <Badge variant="success" className="text-xs py-1">
              <ShieldCheck className="h-3 w-3 mr-1" />
              <span>{user.role}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Kişisel Bilgiler Grubu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ad */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span>Adınız</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Adınız"
                required
                className="w-full rounded-lg border border-white/10 bg-[#0c0e17] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* Soyad */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span>Soyadınız</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Soyadınız"
                required
                className="w-full rounded-lg border border-white/10 bg-[#0c0e17] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            {/* E-posta */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-cyan-400" />
                <span>E-Posta Adresi</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                required
                className="w-full rounded-lg border border-white/10 bg-[#0c0e17] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Giriş yaparken bu e-posta adresi kullanılacaktır.</span>
              </p>
            </div>

            {/* Telefon */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-cyan-400" />
                <span>Telefon Numarası (İsteğe Bağlı)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                className="w-full rounded-lg border border-white/10 bg-[#0c0e17] px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {/* Korumalı / Değiştirilemez Bilgiler Bilgilendirmesi */}
          <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Lock className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
              <span>
                Şirket / Organizasyon: <strong className="text-zinc-200">{user.tenantName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
              <span>
                Yetki Rolü: <strong className="text-zinc-200">{user.role}</strong>
              </span>
              <span className="text-[10px] text-zinc-500">(Yalnızca Sistem Yöneticisi Değiştirebilir)</span>
            </div>
          </div>

          {/* Şifre Değiştirme Bölümü (Açılır / Kapanır) */}
          <div className="rounded-xl border border-white/10 bg-[#0a0c14] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Giriş Şifresini Değiştir</span>
                {isChangingPassword && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300 py-0">
                    Aktif
                  </Badge>
                )}
              </div>
              {isChangingPassword ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isChangingPassword && (
              <div className="p-4 pt-1 border-t border-white/5 space-y-3.5 bg-black/20 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mevcut Şifre */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300">Mevcut Şifre</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 pr-9 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Yeni Şifre */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300">Yeni Şifre</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="En az 6 karakter"
                        className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 pr-9 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Yeni Şifre Tekrar */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-300">Yeni Şifre (Tekrar)</label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Tekrar yazın"
                      className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSubmitting}
              className="text-xs h-9 cursor-pointer"
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="cyber"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Değişiklikleri Kaydet</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
