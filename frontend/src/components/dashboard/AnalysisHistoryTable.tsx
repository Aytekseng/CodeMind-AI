"use client"

import * as React from "react"
import { FileCode, Search, ExternalLink, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface HistoryRecord {
  id: string
  fileName: string
  language: string
  date: string
  severity: "Kritik" | "Yüksek" | "Orta" | "Düşük" | "Güvenli"
  score: number
  findingsCount: number
}

const mockHistory: HistoryRecord[] = [
  {
    id: "doc-101",
    fileName: "UserController.cs",
    language: "C#",
    date: "22.08.2026 18:30",
    severity: "Kritik",
    score: 62,
    findingsCount: 3,
  },
  {
    id: "doc-102",
    fileName: "auth_service.py",
    language: "Python",
    date: "22.08.2026 17:15",
    severity: "Yüksek",
    score: 74,
    findingsCount: 2,
  },
  {
    id: "doc-103",
    fileName: "payment_processor.ts",
    language: "TypeScript",
    date: "21.08.2026 21:04",
    severity: "Orta",
    score: 82,
    findingsCount: 4,
  },
  {
    id: "doc-104",
    fileName: "DatabaseContext.cs",
    language: "C#",
    date: "21.08.2026 14:22",
    severity: "Güvenli",
    score: 96,
    findingsCount: 0,
  },
  {
    id: "doc-105",
    fileName: "kafka_producer.go",
    language: "Go",
    date: "20.08.2026 19:40",
    severity: "Düşük",
    score: 91,
    findingsCount: 1,
  },
]

export function AnalysisHistoryTable({
  records = mockHistory,
  onSelectRecord,
}: {
  records?: HistoryRecord[]
  onSelectRecord?: (record: HistoryRecord) => void
}) {
  const [searchTerm, setSearchTerm] = React.useState<string>("")

  const filteredRecords = records.filter(
    (item) =>
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.language.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getSeverityBadge = (severity: HistoryRecord["severity"]) => {
    switch (severity) {
      case "Kritik":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <ShieldAlert className="h-3 w-3" />
            Kritik
          </Badge>
        )
      case "Yüksek":
        return (
          <Badge variant="warning" className="gap-1 text-[11px] text-amber-400 bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            Yüksek
          </Badge>
        )
      case "Orta":
        return (
          <Badge variant="warning" className="text-[11px]">
            Orta
          </Badge>
        )
      case "Düşük":
      case "Güvenli":
        return (
          <Badge variant="success" className="gap-1 text-[11px]">
            <ShieldCheck className="h-3 w-3" />
            {severity}
          </Badge>
        )
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d101a]/80 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Table Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Geçmiş Analiz Raporları</h3>
          <p className="text-xs text-zinc-400">Taranan tüm kaynak kodlar ve güvenlik inceleme sonuçları</p>
        </div>

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
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
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
                  <span className="font-mono text-xs">{item.fileName}</span>
                </td>
                <td className="px-5 py-3.5 text-zinc-400">{item.language}</td>
                <td className="px-5 py-3.5 text-zinc-400">{item.date}</td>
                <td className="px-5 py-3.5">{getSeverityBadge(item.severity)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`font-bold ${
                      item.score >= 80 ? "text-emerald-400" : item.score >= 60 ? "text-amber-400" : "text-rose-400"
                    }`}
                  >
                    {item.score}/100
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onSelectRecord) onSelectRecord(item)
                      else window.location.href = `/dashboard?docId=${item.id}`
                    }}
                    className="h-7 text-[11px] gap-1 px-2.5 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <span>Raporu Gör</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
