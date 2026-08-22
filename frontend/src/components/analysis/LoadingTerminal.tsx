"use client"

import * as React from "react"
import { Terminal, Shield, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Sparkles, Server, Zap, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnalysisResultEvent } from "@/hooks/useSignalR"

interface LoadingTerminalProps {
  fileName: string
  isUploading?: boolean
  uploadSuccess?: boolean
  uploadError?: string | null
  documentId?: string | null
  analysisResult: AnalysisResultEvent | null
  onReset: () => void
}

interface LogLine {
  id: number
  prefix: string
  message: string
  type: "system" | "kafka" | "worker" | "ai" | "success" | "error"
}

export function LoadingTerminal({
  fileName,
  isUploading,
  uploadSuccess,
  uploadError,
  documentId,
  analysisResult,
  onReset,
}: LoadingTerminalProps) {
  const [logs, setLogs] = React.useState<LogLine[]>([])
  const [isCompleted, setIsCompleted] = React.useState<boolean>(false)
  const logsContainerRef = React.useRef<HTMLDivElement>(null)

  // 1. Initial upload log
  React.useEffect(() => {
    setLogs([
      {
        id: 1,
        prefix: "[HTTP POST]",
        message: `${fileName} dosyası .NET Web API (/api/Document/upload) sunucusuna aktarılıyor...`,
        type: "system",
      },
    ])
  }, [fileName])

  // 2. Real Upload Response from .NET API
  React.useEffect(() => {
    if (uploadSuccess && documentId) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          prefix: "[MINIO & DB]",
          message: `Dosya MinIO nesne depolama alanına ve PostgreSQL'e kaydedildi. (Doküman ID: ${documentId})`,
          type: "system",
        },
        {
          id: Date.now() + 2,
          prefix: "[KAFKA]",
          message: `'file-uploads' olay kuyruğuna mesaj fırlatıldı -> Python AI Worker tetiklendi.`,
          type: "kafka",
        },
        {
          id: Date.now() + 3,
          prefix: "[WORKER / LLM]",
          message: `Llama 3 8B RAG modeli PgVector embedding ve güvenlik analizi yapıyor...`,
          type: "ai",
        },
      ])
    } else if (uploadError) {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + 99,
          prefix: "[ERROR]",
          message: `Yükleme başarısız oldu: ${uploadError}`,
          type: "error",
        },
      ])
    }
  }, [uploadSuccess, uploadError, documentId])

  // 3. Real SignalR Result
  React.useEffect(() => {
    if (analysisResult) {
      setIsCompleted(true)
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + 10,
          prefix: "[SIGNALR]",
          message: `'ReceiveAnalysisResult' sinyali alındı! Dosya ID: ${analysisResult.fileId}`,
          type: "system",
        },
        {
          id: Date.now() + 11,
          prefix: "[SUCCESS]",
          message: `Analiz tamamlandı! Tespit Edilen Kritiklik: ${analysisResult.severity || "Normal"}`,
          type: "success",
        },
      ])
    }
  }, [analysisResult])

  // Auto-scroll to bottom of logs
  React.useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  const getPrefixColor = (type: LogLine["type"]) => {
    switch (type) {
      case "system":
        return "text-cyan-400"
      case "kafka":
        return "text-amber-400"
      case "worker":
        return "text-purple-400"
      case "ai":
        return "text-emerald-400"
      case "success":
        return "text-emerald-300 font-bold"
      case "error":
        return "text-rose-400 font-bold"
      default:
        return "text-zinc-400"
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090e] shadow-2xl backdrop-blur-2xl">
      {/* Terminal Window Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d101a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500/80" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-mono text-xs text-zinc-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            codemind-ai-engine ~ {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {uploadError ? (
            <Badge variant="destructive" className="gap-1 text-[11px]">
              <AlertTriangle className="h-3 w-3" />
              <span>Hata Oluştu</span>
            </Badge>
          ) : isCompleted ? (
            <Badge variant="success" className="gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              <span>Analiz Bitti</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px]">
              <Sparkles className="h-3 w-3 text-cyan-400 animate-spin" />
              <span>{isUploading ? "Sunucuya Yükleniyor..." : "AI Analiz Ediyor..."}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Terminal Log Console */}
      <div
        ref={logsContainerRef}
        className="h-80 overflow-y-auto p-5 font-mono text-xs space-y-3 bg-black/40 scroll-smooth"
      >
        <p className="text-zinc-500">
          # CodeMind AI Daemon v1.0.0 (x86_64-win-dotnet10) - Gerçek Zamanlı Olay Akışı
        </p>

        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-200">
            <span className="text-zinc-600 select-none">❯</span>
            <span className={getPrefixColor(log.type)}>{log.prefix}</span>
            <span className="text-zinc-300">{log.message}</span>
          </div>
        ))}

        {!isCompleted && !uploadError && (
          <div className="flex items-center gap-2 text-cyan-400 animate-pulse pt-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-xs">Kafka & SignalR sinyali dinleniyor...</span>
          </div>
        )}
      </div>

      {/* Terminal Bottom Action Area (when completed or error) */}
      {isCompleted && analysisResult ? (
        <div className="border-t border-white/10 bg-[#0d101a]/95 p-5 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-white text-sm">Gerçek Analiz Raporu Hazır!</span>
                <Badge variant={analysisResult.severity?.toLowerCase().includes("kritik") ? "destructive" : "success"}>
                  {analysisResult.severity || "Tamamlandı"}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 max-w-xl">
                {analysisResult.aiSuggestion}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Yeni Dosya</span>
              </Button>

              <Button
                variant="cyber"
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard?docId=${analysisResult.fileId}`
                }}
                className="gap-2 text-xs"
              >
                <span>Dashboard'da İncele</span>
                <ArrowRight className="h-3.5 w-3.5 fill-black" />
              </Button>
            </div>
          </div>
        </div>
      ) : uploadError ? (
        <div className="border-t border-rose-500/20 bg-rose-500/10 p-4 flex items-center justify-between">
          <span className="text-xs text-rose-300">{uploadError}</span>
          <Button variant="outline" size="sm" onClick={onReset} className="text-xs">
            Tekrar Dene
          </Button>
        </div>
      ) : null}
    </div>
  )
}
