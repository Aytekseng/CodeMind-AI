"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, ShieldAlert, Cpu, Sparkles, FileCode2, ArrowUpRight, Loader2, MousePointerClick } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScoreRadarChart } from "@/components/dashboard/ScoreRadarChart"
import { SeverityBreakdown } from "@/components/dashboard/SeverityBreakdown"
import { CodeDiffViewer } from "@/components/analysis/CodeDiffViewer"
import { AnalysisHistoryTable } from "@/components/dashboard/AnalysisHistoryTable"
import { FileTreeExplorer } from "@/components/dashboard/FileTreeExplorer"
import { Badge } from "@/components/ui/badge"
import {
  DashboardStats,
  DocumentReportDetail,
  ProjectFile,
  getDashboardStatsAsync,
  getDocumentReportAsync,
  getProjectFilesAsync,
} from "@/services/documentService"

function DashboardContent() {
  const searchParams = useSearchParams()
  const docId = searchParams.get("docId")
  const projectId = searchParams.get("projectId")

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [reportDetail, setReportDetail] = React.useState<DocumentReportDetail | null>(null)
  const [projectFiles, setProjectFiles] = React.useState<ProjectFile[]>([])
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(docId)
  const [loading, setLoading] = React.useState<boolean>(true)

  // Seçili dokümanın raporunu yükle
  const loadReport = React.useCallback(async (id: string) => {
    try {
      const reportRes = await getDocumentReportAsync(id)
      if (reportRes.isSuccess && reportRes.data) {
        setReportDetail(reportRes.data)
        setSelectedDocId(id)

        // Eğer doküman bir projeye aitse ve henüz o projenin dosyaları çekilmemişse çek
        if (reportRes.data.projectId) {
          const filesRes = await getProjectFilesAsync(reportRes.data.projectId)
          if (filesRes.isSuccess && filesRes.data && filesRes.data.length > 1) {
            setProjectFiles(filesRes.data)
          }
        }
      }
    } catch (err) {
      console.error("Rapor yüklenirken hata:", err)
    }
  }, [])

  React.useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const statsRes = await getDashboardStatsAsync()
        if (statsRes.isSuccess && statsRes.data) {
          setStats(statsRes.data)
        }

        // 1. Proje ID'si verilmişse proje dosyalarını çek
        if (projectId) {
          const filesRes = await getProjectFilesAsync(projectId)
          if (filesRes.isSuccess && filesRes.data && filesRes.data.length > 0) {
            setProjectFiles(filesRes.data)
            // Eğer belirli bir docId yoksa ilk dosyayı seç
            const targetDocId = docId || filesRes.data[0].documentId
            await loadReport(targetDocId)
            return
          }
        }

        // 2. Belirli bir doküman ID'si seçilmişse
        if (docId) {
          await loadReport(docId)
        } else {
          setReportDetail(null)
          setProjectFiles([])
        }
      } catch (err) {
        console.error("Dashboard verileri yüklenirken hata:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [docId, projectId, loadReport])

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
            <CardTitle className="text-xs font-medium text-zinc-400">Kritik & Yüksek Zafiyet</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {(stats?.criticalCount ?? 0) + (stats?.highCount ?? 0)}
            </div>
            <p className="text-[11px] text-rose-400/80 mt-1">
              {(stats?.criticalCount ?? 0)} Kritik, {(stats?.highCount ?? 0)} Yüksek
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
              {stats?.averageScore ?? 85.0}/100
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              AI Denetim Puanı
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">Model Motoru</CardTitle>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono truncate">
              {reportDetail?.modelUsed || "Llama 3 8B"}
            </div>
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
              {reportDetail ? `Analiz Raporu: ${reportDetail.fileName}` : "Kaynak Kod & AI Güvenlik İncelemesi"}
            </h2>
            <p className="text-xs text-zinc-400">
              {reportDetail ? "Yapay zekanın tespit ettiği satırlar ve refactor önerileri" : "Seçili dosyanın detaylı güvenlik analizi ve kod içeriği"}
            </p>
          </div>
          {reportDetail && (
            <div className="flex items-center gap-2">
              {reportDetail.projectName && (
                <Badge variant="secondary" className="text-xs font-mono text-cyan-300 bg-cyan-950/50 border-cyan-500/30">
                  📁 {reportDetail.projectName}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono uppercase">
                {reportDetail.language}
              </Badge>
            </div>
          )}
        </div>

        {reportDetail ? (
          projectFiles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4">
                <FileTreeExplorer
                  files={projectFiles}
                  selectedDocumentId={selectedDocId}
                  onSelectDocument={(id) => loadReport(id)}
                  projectName={reportDetail.projectName || "Proje Deposu"}
                />
              </div>
              <div className="lg:col-span-8 min-w-0">
                <CodeDiffViewer
                  fileName={reportDetail.fileName}
                  language={reportDetail.language || "csharp"}
                  originalCode={reportDetail.originalCode}
                  suggestedCode={reportDetail.aiSuggestion}
                  vulnerableLines={reportDetail.vulnerableLines}
                  vulnerabilityTitle={reportDetail.severity}
                  vulnerabilityDescription={reportDetail.aiSuggestion}
                  modelUsed={reportDetail.modelUsed}
                />
              </div>
            </div>
          ) : (
            <CodeDiffViewer
              fileName={reportDetail.fileName}
              language={reportDetail.language || "csharp"}
              originalCode={reportDetail.originalCode}
              suggestedCode={reportDetail.aiSuggestion}
              vulnerableLines={reportDetail.vulnerableLines}
              vulnerabilityTitle={reportDetail.severity}
              vulnerabilityDescription={reportDetail.aiSuggestion}
              modelUsed={reportDetail.modelUsed}
            />
          )
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d101a] p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <FileCode2 className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-semibold text-white">İncelenecek Kod Dosyası Seçilmedi</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Aşağıdaki <span className="text-zinc-200 font-medium">Geçmiş Analiz Raporları</span> tablosundan bir dosyanın yanındaki <span className="text-cyan-400 font-semibold">"İncele"</span> butonuna tıklayarak veya yeni bir dosya yükleyerek kod içeriğini ve Llama 3'ün güvenlik analiz raporunu burada detaylıca inceleyebilirsiniz.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="cyber"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="text-xs"
              >
                Yeni Kod Dosyası Yükle
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Past Reports Table */}
      <AnalysisHistoryTable />
    </div>
  )
}

import { AuthGuard } from "@/components/auth/AuthGuard"

export default function DashboardPage() {
  return (
    <AuthGuard
      pageTitle="Güvenlik & Analiz Dashboard'u"
      pageDescription="Şirketinize ait kod güvenlik metriklerini, zafiyet dağılımlarını ve detaylı AI analiz raporlarını görmek için lütfen giriş yapın."
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  )
}

