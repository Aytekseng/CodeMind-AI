"use client"

import * as React from "react"
import { History, Shield, Filter } from "lucide-react"
import { AnalysisHistoryTable } from "@/components/dashboard/AnalysisHistoryTable"
import { Badge } from "@/components/ui/badge"

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Geçmiş Analiz Arşivi</h1>
            <Badge variant="outline" className="text-[11px] gap-1 border-cyan-500/30 text-cyan-300">
              <History className="h-3 w-3" />
              <span>Arşiv Kayıtları</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Daha önce taranmış tüm kaynak kod dosyalarının rapor geçmişi ve denetim logları
          </p>
        </div>
      </div>

      {/* History Table Component */}
      <AnalysisHistoryTable />
    </div>
  )
}
