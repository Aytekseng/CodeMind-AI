"use client"

import * as React from "react"
import {
  Users,
  UserPlus,
  Shield,
  Code,
  Eye,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Lock,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { teamService, TeamMember, CreateTeamMemberPayload } from "@/services/teamService"
import { toast } from "sonner"

export function TeamManagementCard() {
  const { user } = useAuth()
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState<boolean>(false)

  // New member form state
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("Developer")
  const [temporaryPassword, setTemporaryPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [copiedPassword, setCopiedPassword] = React.useState(false)

  // Member being removed state
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null)

  const fetchMembers = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await teamService.getMembers()
      if (res.isSuccess && res.data) {
        setMembers(res.data)
      } else {
        toast.error(res.message || "Takım üyeleri yüklenemedi.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Takım üyeleri alınırken hata oluştu.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user?.role === "Admin") {
      fetchMembers()
    }
  }, [user, fetchMembers])

  // Only Admins can see or manage the team
  if (user?.role !== "Admin") {
    return null
  }

  // Generate a random secure temporary password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
    let pass = ""
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setTemporaryPassword(pass)
  }

  const handleCopyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword)
      setCopiedPassword(true)
      toast.success("Geçici şifre panoya kopyalandı!")
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  const handleOpenModal = () => {
    generateRandomPassword()
    setIsInviteModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsInviteModalOpen(false)
    setFirstName("")
    setLastName("")
    setEmail("")
    setRole("Developer")
    setTemporaryPassword("")
    setCopiedPassword(false)
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("Lütfen ad, soyad ve e-posta alanlarını doldurun.")
      return
    }

    if (!temporaryPassword || temporaryPassword.length < 6) {
      toast.error("Geçici şifre en az 6 karakter olmalıdır.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateTeamMemberPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        temporaryPassword,
      }

      const res = await teamService.createMember(payload)
      if (res.isSuccess) {
        toast.success(`${firstName} ${lastName} başarıyla takıma eklendi!`)
        handleCloseModal()
        fetchMembers()
      } else {
        toast.error(res.message || "Üye eklenirken hata oluştu.")
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Sunucu hatası.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingMemberId(memberId)
    try {
      const res = await teamService.updateMemberRole(memberId, newRole)
      if (res.isSuccess) {
        toast.success("Kullanıcı rolü başarıyla güncellendi.")
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        )
      } else {
        toast.error(res.message || "Rol güncellenemedi.")
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Rol güncellenirken hata oluştu.")
    } finally {
      setUpdatingMemberId(null)
    }
  }

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.id === user.userId) {
      toast.error("Kendi hesabınızı bu panelden çıkaramazsınız.")
      return
    }

    const confirm = window.confirm(
      `${member.firstName} ${member.lastName} (${member.email}) adlı çalışma arkadaşınızı şirketten çıkarmak istediğinize emin misiniz?\n\nBu kullanıcının hesabı silinecek ve şirketle ilişiği kesilecektir.`
    )
    if (!confirm) return

    setRemovingMemberId(member.id)
    try {
      const res = await teamService.removeMember(member.id)
      if (res.isSuccess) {
        toast.success("Kullanıcı şirketten çıkarıldı ve hesabı silindi.")
        setMembers((prev) => prev.filter((m) => m.id !== member.id))
      } else {
        toast.error(res.message || "Kullanıcı silinemedi.")
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Kullanıcı silinirken hata oluştu.")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[11px] gap-1 py-0.5">
            <Shield className="h-3 w-3 text-amber-400" />
            <span>Yönetici</span>
          </Badge>
        )
      case "Developer":
        return (
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10 text-[11px] gap-1 py-0.5">
            <Code className="h-3 w-3 text-cyan-400" />
            <span>Geliştirici</span>
          </Badge>
        )
      case "Auditor":
        return (
          <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 text-[11px] gap-1 py-0.5">
            <Eye className="h-3 w-3 text-purple-400" />
            <span>Denetçi</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {roleName}
          </Badge>
        )
    }
  }

  return (
    <Card className="glass-panel border-white/10 shadow-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-white">
                Takım & Çalışma Arkadaşları
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Şirketinize bağlı çalışma arkadaşlarınızı yönetin, yeni üyeler ekleyin veya yetkilerini belirleyin.
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="cyber"
            size="sm"
            onClick={handleOpenModal}
            className="text-xs h-8 gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Yeni Üye Ekle</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Güvenlik Bilgilendirme Kutusu */}
        <div className="rounded-xl border border-white/5 bg-[#090b14] p-3 text-[11px] text-zinc-400 flex items-start gap-2.5 leading-relaxed">
          <Lock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-zinc-200">Sıfır Güven (Zero-Trust) Kuralı:</strong> Takımdan çıkarılan bir çalışanın hesabı veritabanından tamamen silinir; böylece şirketsiz asılı zombi hesap kalmaz. Şirketin geçmiş analiz raporları ve güvenlik arşivi şirkete ait olarak korunur.
          </div>
        </div>

        {/* Üyeler Tablosu / Listesi */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-zinc-400 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Takım üyeleri yükleniyor...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
            Şirketinize kayıtlı takım üyesi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Çalışan</th>
                  <th className="py-2.5 px-3 font-semibold">E-Posta</th>
                  <th className="py-2.5 px-3 font-semibold">Mevcut Rol</th>
                  <th className="py-2.5 px-3 font-semibold">Rol Yönetimi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => {
                  const isCurrentUser = member.id === user.userId
                  const initials = `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.toUpperCase()

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Çalışan Adı & Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-[11px] font-bold text-cyan-400 border border-white/10 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-medium text-white">
                              {member.firstName} {member.lastName}
                            </span>
                            {isCurrentUser && (
                              <span className="ml-1.5 text-[10px] text-cyan-400 font-mono">(Siz)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* E-posta */}
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                        {member.email}
                      </td>

                      {/* Mevcut Rol Rozeti */}
                      <td className="py-3 px-3">
                        {getRoleBadge(member.role)}
                      </td>

                      {/* Rol Değiştirme Seçicisi */}
                      <td className="py-3 px-3">
                        {isCurrentUser ? (
                          <span className="text-[11px] text-zinc-500 italic">Değiştirilemez</span>
                        ) : (
                          <select
                            value={member.role}
                            disabled={updatingMemberId === member.id}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded-lg border border-white/10 bg-[#0d101a] px-2 py-1 text-xs text-white focus:border-cyan-500/50 focus:outline-none cursor-pointer"
                          >
                            <option value="Admin">👑 Yönetici (Admin)</option>
                            <option value="Developer">💻 Geliştirici (Developer)</option>
                            <option value="Auditor">🛡️ Denetçi (Auditor)</option>
                          </select>
                        )}
                      </td>

                      {/* Çıkar Butonu */}
                      <td className="py-3 px-3 text-right">
                        {!isCurrentUser && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={removingMemberId === member.id}
                            onClick={() => handleRemoveMember(member)}
                            className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs cursor-pointer gap-1"
                          >
                            {removingMemberId === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            <span>Çıkar</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Yeni Üye Ekleme Modalı */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d101a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Yeni Takım Arkadaşı Ekle</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ad */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium">Ad</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ad"
                    className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                {/* Soyad */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium">Soyad</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Soyad"
                    className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* E-posta */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">E-Posta Adresi</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="calisan@sirket.com"
                  className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              {/* Rol Seçimi */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-medium">Atanacak Rol</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("Developer")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      role === "Developer"
                        ? "bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "bg-[#07080c] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                      <Code className="h-3 w-3 text-cyan-400" />
                      <span>Geliştirici</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">Kod ve .ZIP analizi başlatabilir.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("Auditor")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      role === "Auditor"
                        ? "bg-purple-500/20 border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                        : "bg-[#07080c] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                      <Eye className="h-3 w-3 text-purple-400" />
                      <span>Denetçi</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">Salt okunur; raporları ve grafikleri inceler.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("Admin")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      role === "Admin"
                        ? "bg-amber-500/20 border-amber-500/50 text-white shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-[#07080c] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                      <Shield className="h-3 w-3 text-amber-400" />
                      <span>Yönetici</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2">Tam yetki; takım ve ayarları yönetir.</p>
                  </button>
                </div>
              </div>

              {/* Geçici Şifre */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-300 font-medium">İlk Giriş İçin Geçici Şifre</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Yeniden Üret</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 pr-20 text-xs text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="absolute right-2 px-2 py-1 rounded bg-zinc-800 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedPassword ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPassword ? "Kopyalandı" : "Kopyala"}</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Bu şifreyi çalışma arkadaşınıza iletin. İlk girişinde Ayarlar sayfasından şifresini değiştirebilir.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="text-xs h-8 cursor-pointer"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  variant="cyber"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Ekleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Üyeyi Ekle</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
