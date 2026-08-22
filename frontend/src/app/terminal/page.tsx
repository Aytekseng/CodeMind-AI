"use client"

import * as React from "react"
import { Terminal, Sparkles } from "lucide-react"
import { LoadingTerminal } from "@/components/analysis/LoadingTerminal"
import { useSignalR } from "@/hooks/useSignalR"
import { Badge } from "@/components/ui/badge"

export default function TerminalPage() {
  const { latestResult } = useSignalR()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Canlı AI Daemon Terminali</h1>
            <Badge variant="default" className="text-[11px] gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Olay Güdümlü Akış</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kafka kuyrukları, MinIO depolama ve Llama 3 AI Worker arasındaki anlık olay akışı
          </p>
        </div>
      </div>

      <LoadingTerminal
        fileName="SystemDaemon.cs"
        analysisResult={latestResult}
        onReset={() => {}}
      />
    </div>
  )
}
