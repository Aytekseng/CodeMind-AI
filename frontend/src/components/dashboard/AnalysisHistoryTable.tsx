"use client"

import * as React from "react"
import {
  FileCode,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Sparkles,
  Copy,
  Check,
  Filter
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DocumentHistoryItem, getHistoryAsync } from "@/services/documentService"

interface AnalysisHistoryTableProps {
  records?: DocumentHistoryItem[]
  onSelectRecord?: (record: DocumentHistoryItem) => void
}

export function AnalysisHistoryTable({ records: propRecords, onSelectRecord }: AnalysisHistoryTableProps) {
  const [records, setRecords] = React.useState<DocumentHistoryItem[]>(propRecords || [])
  const [loading, setLoading] = React.useState<boolean>(!propRecords)
  const [searchTerm, setSearchTerm] = React.useState<string>("")
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("ALL")
  const [activeModalItem, setActiveModalItem] = React.useState<DocumentHistoryItem | null>(null)
  const [copied, setCopied] = React.useState<boolean>(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await getHistoryAsync()
      if (response && response.isSuccess && Array.isArray(response.data)) {
        setRecords(response.data)
      } else if (Array.isArray(response)) {
        setRecords(response)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.warn("Geçmiş kayıtlar sunucudan alınamadı:", err)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!propRecords) {
      loadData()
    } else {
      setRecords(Array.isArray(propRecords) ? propRecords : [])
    }
  }, [propRecords, loadData])

  const safeRecords = Array.isArray(records) ? records : []

  const filteredRecords = safeRecords.filter((item) => {
    if (!item) return false
    const matchesSearch =
      (item.fileName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.language || "").toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedSeverity === "ALL") return matchesSearch
    const sev = (item.severity || "").toLowerCase()
    if (selectedSeverity === "CRITICAL") return matchesSearch && (sev.includes("kritik") || sev.includes("critical"))
    if (selectedSeverity === "HIGH") return matchesSearch && (sev.includes("yüksek") || sev.includes("high"))
    if (selectedSeverity === "MEDIUM") return matchesSearch && (sev.includes("orta") || sev.includes("medium"))
    if (selectedSeverity === "SAFE") return matchesSearch && (sev.includes("düşük") || sev.includes("low") || sev.includes("güvenli"))
    return matchesSearch
  })

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase() || ""
    if (s.includes("kritik") || s.includes("critical")) {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px]">
          <ShieldAlert className="h-3 w-3" />
          {severity || "Kritik"}
        </Badge>
      )
    }
    if (s.includes("yüksek") || s.includes("high")) {
      return (
        <Badge variant="warning" className="gap-1 text-[11px] text-amber-400 bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-3 w-3" />
          {severity || "Yüksek"}
        </Badge>
      )
    }
    if (s.includes("orta") || s.includes("medium")) {
      return (
        <Badge variant="warning" className="text-[11px]">
          {severity || "Orta"}
        </Badge>
      )
    }
    return (
      <Badge variant="success" className="gap-1 text-[11px]">
        <ShieldCheck className="h-3 w-3" />
        {severity || "Güvenli"}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    } catch {
      return dateStr
    }
  }

  const handleCopySuggestion = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Table Header, Filters & Search */}
      <div className="flex flex-col gap-4 p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Geçmiş Analiz Raporları</h3>
            <p className="text-xs text-zinc-400">PostgreSQL veritabanındaki tüm analiz kayıtları ve güvenlik denetimleri</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Dosya veya dil ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 px-2.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-zinc-500 text-[11px] font-mono mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtre:
          </span>
          {[
            { id: "ALL", label: "Tümü" },
            { id: "CRITICAL", label: "Kritik" },
            { id: "HIGH", label: "Yüksek" },
            { id: "MEDIUM", label: "Orta" },
            { id: "SAFE", label: "Güvenli / Düşük" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSeverity(tab.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                selectedSeverity === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono">PostgreSQL verileri getiriliyor...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-400 gap-3">
            <FileCode className="h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-300 font-medium">Kayıtlı analiz raporu bulunamadı.</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Henüz bir dosya analizi yapmadıysanız ana sayfadan dosya yükleyebilir veya filtreyi değiştirebilirsiniz.
            </p>
            <Button
              variant="cyber"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="mt-2 text-xs"
            >
              Yeni Dosya Yükle
            </Button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400 uppercase font-mono text-[11px]">
              <tr>
                <th className="px-5 py-3">Dosya Adı</th>
                <th className="px-5 py-3">Dil</th>
                <th className="px-5 py-3">Tarih</th>
                <th className="px-5 py-3">Zafiyet Düzeyi</th>
                <th className="px-5 py-3">Skor</th>
                <th className="px-5 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredRecords.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2.5">
                    <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="font-mono text-xs">{item.fileName || "Belirsiz Dosya"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400">{item.language || "Code"}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-3.5">{getSeverityBadge(item.severity)}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-bold ${
                        (item.score ?? 85) >= 80
                          ? "text-emerald-400"
                          : (item.score ?? 85) >= 60
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {item.score ?? 85}/100
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onSelectRecord) {
                            onSelectRecord(item)
                          } else {
                            window.location.href = `/dashboard?docId=${item.id}`
                          }
                        }}
                        className="h-7 text-[11px] gap-1 px-2.5 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                      >
                        <span>İncele</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Report Inspector Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d101a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#121624]">
              <div className="flex items-center gap-2.5">
                <FileCode className="h-5 w-5 text-cyan-400" />
                <span className="font-semibold text-white text-sm">{activeModalItem.fileName}</span>
                {getSeverityBadge(activeModalItem.severity)}
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-400 border-b border-white/5 pb-2">
                <span>Tarih: {formatDate(activeModalItem.createdAt)}</span>
                <span>Dil: {activeModalItem.language}</span>
                <span className="text-cyan-400 font-bold">Skor: {activeModalItem.score ?? 85}/100</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Llama 3 AI Analiz Raporu:
                  </span>
                  {activeModalItem.latestAiSuggestion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopySuggestion(activeModalItem.latestAiSuggestion!)}
                      className="h-6 text-[10px] gap-1 px-2"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
                    </Button>
                  )}
                </div>

                <div className="rounded-xl bg-black/60 border border-white/10 p-4 text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {activeModalItem.latestAiSuggestion || "Bu dosya için henüz yapay zeka analiz raporu oluşturulmamış."}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-[#090b12] px-6 py-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveModalItem(null)} className="text-xs">
                Kapat
              </Button>
              <Button
                variant="cyber"
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard?docId=${activeModalItem.id}`
                }}
                className="text-xs gap-1.5"
              >
                <span>Dashboard'da Detaylı Aç</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
