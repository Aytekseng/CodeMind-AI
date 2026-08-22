"use client"

import * as React from "react"
import { ShieldCheck, ShieldAlert, Cpu, Activity, Sparkles, FileCode2, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScoreRadarChart } from "@/components/dashboard/ScoreRadarChart"
import { SeverityBreakdown } from "@/components/dashboard/SeverityBreakdown"
import { CodeDiffViewer } from "@/components/analysis/CodeDiffViewer"
import { AnalysisHistoryTable } from "@/components/dashboard/AnalysisHistoryTable"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Güvenlik & Analiz Dashboard'u</h1>
            <Badge variant="default" className="text-[11px] gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Canlı Metrikler</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Yapay zeka (Llama 3 8B RAG) tarafından gerçekleştirilen kod incelemeleri ve zafiyet istatistikleri
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
            <div className="text-2xl font-extrabold text-white font-mono">128</div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>Bu hafta +18 dosya</span>
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">Ortalama Güvenlik Skoru</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">88.4 / 100</div>
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
            <div className="text-2xl font-extrabold text-rose-400 font-mono">2 Adet</div>
            <p className="text-[11px] text-rose-300/80 mt-1">
              Acil müdahale öneriliyor
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-zinc-400">AI Çözüm Başarısı</CardTitle>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">%98.2</div>
            <p className="text-[11px] text-cyan-300/80 mt-1">
              Otomatik refactor önerisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScoreRadarChart />
        <SeverityBreakdown />
      </div>

      {/* Interactive Code Review & Diff Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Son Analiz Edilen Kod İncelemesi</h2>
            <p className="text-xs text-zinc-400">Yapay zekanın tespit ettiği satırlar ve refactor önerileri</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">C# .NET Backend</Badge>
        </div>

        <CodeDiffViewer />
      </div>

      {/* Past Reports Table */}
      <AnalysisHistoryTable />
    </div>
  )
}
