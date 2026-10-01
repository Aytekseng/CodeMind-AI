"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Download, Trash2, Lock, X, Loader2, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { teamService } from "@/services/teamService"
import { toast } from "sonner"

export function DangerZoneCard() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [confirmName, setConfirmName] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Sadece Admin kullanıcılar görebilir
  if (user?.role !== "Admin") {
    return null
  }

  const expectedCompanyName = user.tenantName || ""

  const isFormValid =
    password.length > 0 &&
    confirmName.trim().toLowerCase() === expectedCompanyName.trim().toLowerCase()

  const handleDeleteCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isDeleting) return

    try {
      setIsDeleting(true)
      const res = await teamService.deleteCompanyWorkspace({
        password,
        confirmationCompanyName: confirmName.trim()
      })

      if (res.isSuccess) {
        toast.success(res.message || "Şirket ve tüm veriler kalıcı olarak silindi.")
        setIsModalOpen(false)
        logout()
        router.push("/register")
      } else {
        toast.error(res.message || "Şirket silinirken hata oluştu.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Sunucuyla iletişim kurulurken bir hata oluştu.")
    } finally {
      setIsDeleting(false)
    }
  }

  const [isExporting, setIsExporting] = React.useState(false)

  const handleExportDataClick = async () => {
    if (isExporting) return
    try {
      setIsExporting(true)
      toast.info("Kurumsal denetim raporu hazırlanıyor...", {
        description: "Tüm projeler, ekip verileri ve zafiyet özetleri PDF formatında derleniyor."
      })
      const downloadedFile = await teamService.exportCompanyPdf()
      toast.success("Kurumsal PDF raporu başarıyla indirildi!", {
        description: `${downloadedFile} bilgisayarınıza kaydedildi.`
      })
    } catch (err: any) {
      toast.error(err?.message || "PDF raporu oluşturulurken bir hata oluştu.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Card className="glass-panel border-rose-500/20 bg-rose-950/5">
        <CardHeader className="pb-3 border-b border-rose-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-rose-200">
                  Tehlikeli Bölge & Şirket Feshi (Danger Zone)
                </CardTitle>
                <CardDescription className="text-xs text-rose-300/70">
                  Veri arşivleme veya şirketin iflası/kapanması durumunda kalıcı veri imhası işlemlerini yönetir.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-[10px]">
              Yalnızca Yönetici (Admin)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* 1. Verileri Dışa Aktarma */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-white/5 bg-[#0a0c14]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-medium text-white">Tüm Analiz Verilerini & Raporları Dışa Aktar</h4>
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                  PDF Raporu
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400 max-w-xl">
                Şirketinize ait tüm kaynak kod güvenlik analiz raporlarını, bulguları ve zafiyet özetlerini kurumsal PDF formatında indirin.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportDataClick}
              className="border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300 text-xs gap-1.5 shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>İndiriliyor...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Tüm Verileri İndir (PDF)</span>
                </>
              )}
            </Button>
          </div>

          {/* 2. Şirketi ve Tüm Verileri Kalıcı Silme (Kritik Offboarding) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/10">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-rose-200">
                Şirket Çalışma Alanını ve Tüm Verileri Kalıcı Olarak Sil
              </h4>
              <p className="text-[11px] text-zinc-400 max-w-xl leading-relaxed">
                Şirketin kapanması veya feshi durumunda; şirketin tüm projelerini, yüklenen kodlarını, yapay zeka analiz raporlarını ve kendi hesabınız dahil kayıtlı tüm ekip hesaplarını geri döndürülemez biçimde kalıcı olarak imha eder.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setPassword("")
                setConfirmName("")
                setIsModalOpen(true)
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shrink-0 shadow-lg shadow-rose-900/30 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Şirketi & Hesabı Sil</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kalıcı Silme Onay Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0d0a0d] p-6 shadow-2xl shadow-rose-950/40">
            {/* Kapat Butonu */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Başlığı & İkon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Şirket Çalışma Alanını İmha Et
                </h3>
                <p className="text-xs text-rose-400 font-medium">
                  Bu işlem kesinlikle geri alınamaz (Zero-Trust İmhası)
                </p>
              </div>
            </div>

            {/* Uyarı Kutusu */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5 mb-5 text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-rose-300">
                Onay vermeniz halinde aşağıdaki işlemler anında gerçekleştirilir:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                <li><strong className="text-white">{expectedCompanyName}</strong> adlı şirkete ait tüm kayıtlar silinir.</li>
                <li>Tüm kaynak kod projeleri ve yüklenen ZIP arşivleri imha edilir.</li>
                <li>Tüm yapay zeka güvenlik raporları ve vektör kayıtları temizlenir.</li>
                <li>Kendi hesabınız dahil şirketteki tüm ekip üyelerinin hesapları silinir.</li>
              </ul>
            </div>

            {/* Onay Formu */}
            <form onSubmit={handleDeleteCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  1. Yönetici Şifreniz
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mevcut şifrenizi girin"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  2. Şirket Adını Yazarak Onaylayın:{" "}
                  <span className="font-mono text-rose-300 font-bold select-all bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/30">
                    {expectedCompanyName}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={`Onaylamak için "${expectedCompanyName}" yazın`}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isDeleting}
                  className="border-white/10 text-zinc-300 hover:bg-white/5 text-xs"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={!isFormValid || isDeleting}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>İmha Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Kalıcı Olarak İmha Et</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
