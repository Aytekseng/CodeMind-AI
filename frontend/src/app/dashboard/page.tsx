"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, ShieldAlert, Cpu, Sparkles, FileCode2, ArrowUpRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoreRadarChart } from "@/components/dashboard/ScoreRadarChart"
import { SeverityBreakdown } from "@/components/dashboard/SeverityBreakdown"
import { CodeDiffViewer } from "@/components/analysis/CodeDiffViewer"
import { AnalysisHistoryTable } from "@/components/dashboard/AnalysisHistoryTable"
import { Badge } from "@/components/ui/badge"
import {
  DashboardStats,
  DocumentReportDetail,
  getDashboardStatsAsync,
  getDocumentReportAsync,
} from "@/services/documentService"

function DashboardContent() {
  const searchParams = useSearchParams()
  const docId = searchParams.get("docId")

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [reportDetail, setReportDetail] = React.useState<DocumentReportDetail | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const statsRes = await getDashboardStatsAsync()
        if (statsRes.isSuccess && statsRes.data) {
          setStats(statsRes.data)
        }

        // Eğer belirli bir doküman ID'si seçilmişse onun raporunu getir
        if (docId) {
          const reportRes = await getDocumentReportAsync(docId)
          if (reportRes.isSuccess && reportRes.data) {
            setReportDetail(reportRes.data)
          }
        }
      } catch (err) {
        console.error("Dashboard verileri yüklenirken hata:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [docId])

  const severityData = React.useMemo(() => {
    if (!stats) return undefined
    return [
      { name: "Kritik", count: stats.criticalCount, color: "#f43f5e" },
      { name: "Yüksek", count: stats.highCount, color: "#f97316" },
      { name: "Orta", count: stats.mediumCount, color: "#eab308" },
      { name: "Düşük / Güvenli", count: stats.lowCount, color: "#10b981" },
    ]
  }, [stats])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Güvenlik & Analiz Dashboard'u</h1>
            <Badge variant="default" className="text-[11px] gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Canlı PostgreSQL Verileri</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Yapay zeka (Llama 3 8B RAG) tarafından gerçekleştirilen gerçek kod incelemeleri ve zafiyet istatistikleri
          </p>
        </div>
      </div>

      {/* Top 4 Quick Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">Toplam Taranan Dosya</CardTitle>
            <FileCode2 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats?.totalDocuments ?? 0}
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>Veritabanında kayıtlı</span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">Ortalama Güvenlik Skoru</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats?.averageScore ?? 85} / 100
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              OWASP Top 10 standartlarında
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">Kritik Güvenlik Açığı</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {stats?.criticalCount ?? 0} Adet
            </div>
            <p className="text-[11px] text-rose-300/80 mt-1">
              {stats?.criticalCount ? "Acil müdahale öneriliyor" : "Kritik açık tespit edilmedi"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">AI Çözüm Durumu</CardTitle>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">Llama 3 8B</div>
            <p className="text-[11px] text-cyan-300/80 mt-1">
              RAG & PgVector Entegre
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScoreRadarChart />
        <SeverityBreakdown data={severityData} />
      </div>

      {/* Interactive Code Review & Diff Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {reportDetail ? `Analiz Raporu: ${reportDetail.fileName}` : "Son Analiz Edilen Kod İncelemesi"}
            </h2>
            <p className="text-xs text-zinc-400">Yapay zekanın tespit ettiği satırlar ve refactor önerileri</p>
          </div>
          {reportDetail && (
            <Badge variant="outline" className="text-xs font-mono uppercase">
              {reportDetail.language}
            </Badge>
          )}
        </div>

        {reportDetail ? (
          <CodeDiffViewer
            fileName={reportDetail.fileName}
            language={reportDetail.language || "csharp"}
            originalCode={reportDetail.originalCode}
            suggestedCode={reportDetail.aiSuggestion}
            vulnerableLines={reportDetail.vulnerableLines}
            vulnerabilityTitle={reportDetail.severity}
            vulnerabilityDescription={reportDetail.aiSuggestion}
          />
        ) : (
          <CodeDiffViewer />
        )}
      </div>

      {/* Past Reports Table */}
      <AnalysisHistoryTable />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
