"use client"

import * as React from "react"
import { Terminal, Shield, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Sparkles, Server, Zap, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnalysisResultEvent } from "@/hooks/useSignalR"

interface BatchUploadInfo {
  projectId: string
  projectName: string
  batchId: string
  totalExtractedFiles: number
  extractedFiles: string[]
  documentIds: string[]
}

interface LoadingTerminalProps {
  fileName: string
  isUploading?: boolean
  uploadSuccess?: boolean
  uploadError?: string | null
  documentId?: string | null
  batchInfo?: BatchUploadInfo | null
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
  batchInfo,
  analysisResult,
  onReset,
}: LoadingTerminalProps) {
  const [logs, setLogs] = React.useState<LogLine[]>([])
  const [isCompleted, setIsCompleted] = React.useState<boolean>(false)
  const [completedFiles, setCompletedFiles] = React.useState<Map<string, { severity: string; aiSuggestion: string; fileName?: string }>>(new Map())
  const logsContainerRef = React.useRef<HTMLDivElement>(null)

  const isZipMode = Boolean(batchInfo && batchInfo.totalExtractedFiles > 1)
  const totalFilesCount = batchInfo?.totalExtractedFiles || 1
  const completedCount = completedFiles.size
  const progressPercent = Math.min(100, Math.round((completedCount / totalFilesCount) * 100))

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
    if (uploadSuccess) {
      if (batchInfo && batchInfo.totalExtractedFiles > 0) {
        setLogs((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            prefix: "[ZIP UNPACK]",
            message: `'${batchInfo.projectName}' arşivinden ${batchInfo.totalExtractedFiles} adet kaynak kod dosyası başarıyla ayıklandı. (node_modules, bin ve ikili dosyalar filtrelendi)`,
            type: "system",
          },
          {
            id: Date.now() + 2,
            prefix: "[MINIO & DB]",
            message: `Tüm dosyalar MinIO nesne deposuna kaydedildi ve PostgreSQL Proje ID (${batchInfo.projectId.slice(0, 8)}...) altına bağlandı.`,
            type: "system",
          },
          {
            id: Date.now() + 3,
            prefix: "[KAFKA BATCH]",
            message: `${batchInfo.totalExtractedFiles} adet 'file-uploads' olayı Kafka analiz kuyruğuna gönderildi.`,
            type: "kafka",
          },
          {
            id: Date.now() + 4,
            prefix: "[WORKER / LLM]",
            message: `Python AI Worker (Llama 3 8B RAG) dosyaları sırayla AST parçalama ve güvenlik taramasına aldı...`,
            type: "ai",
          },
        ])
      } else if (documentId) {
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
      }
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
  }, [uploadSuccess, uploadError, documentId, batchInfo])

  // 3. Real SignalR Result
  React.useEffect(() => {
    if (analysisResult) {
      // Çoklu dosya kontrolü
      if (batchInfo && batchInfo.documentIds?.length > 0) {
        const isBelongingToBatch = 
          batchInfo.documentIds.includes(analysisResult.fileId) ||
          (analysisResult.projectId && analysisResult.projectId === batchInfo.projectId)

        if (isBelongingToBatch) {
          setCompletedFiles((prev) => {
            const next = new Map(prev)
            next.set(analysisResult.fileId, {
              severity: analysisResult.severity,
              aiSuggestion: analysisResult.aiSuggestion,
              fileName: analysisResult.fileName,
            })

            const count = next.size
            const fileTitle = analysisResult.fileName ? analysisResult.fileName.split('/').pop() : analysisResult.fileId.slice(0, 8)
            
            setLogs((l) => [
              ...l,
              {
                id: Date.now() + Math.random(),
                prefix: `[${count}/${batchInfo.totalExtractedFiles}]`,
                message: `${fileTitle} analizi tamamlandı! Sonuç: ${analysisResult.severity || "Normal"}`,
                type: analysisResult.severity?.toLowerCase().includes("kritik") ? "error" : "success",
              },
            ])

            if (count >= batchInfo.totalExtractedFiles) {
              setIsCompleted(true)
              setLogs((l) => [
                ...l,
                {
                  id: Date.now() + 999,
                  prefix: "[TAMAMLANDI]",
                  message: `Tüm proje arşivi (${batchInfo.totalExtractedFiles} dosya) başarıyla tarandı ve raporlandı!`,
                  type: "success",
                },
              ])
            }
            return next
          })
          return
        }
      }

      // Tekil dosya
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
  }, [analysisResult, batchInfo])

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
              <span>{isZipMode ? "Tüm Proje Tarandı" : "Analiz Bitti"}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px]">
              <Sparkles className="h-3 w-3 text-cyan-400 animate-spin" />
              <span>{isUploading ? "Arşiv Yükleniyor..." : isZipMode ? `Taranıyor (${completedCount}/${totalFilesCount})` : "AI Analiz Ediyor..."}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Multi-File Progress Bar Header */}
      {isZipMode && (
        <div className="border-b border-white/10 bg-[#0d101a]/80 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400 font-mono">
              Proje Arşivi: <span className="text-cyan-400 font-semibold">{batchInfo?.projectName}</span>
            </span>
            <span className="font-mono text-cyan-400 font-semibold">
              {completedCount} / {totalFilesCount} dosya (%{progressPercent})
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

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
            <span className="text-xs">
              {isZipMode ? `Dosyalar Llama 3 tarafından taranıyor (${completedCount}/${totalFilesCount})...` : "Kafka & SignalR sinyali dinleniyor..."}
            </span>
          </div>
        )}
      </div>

      {/* Terminal Bottom Action Area (when completed or error) */}
      {isCompleted ? (
        <div className="border-t border-white/10 bg-[#0d101a]/95 p-5 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-white text-sm">
                  {isZipMode ? `Proje Taraması Tamamlandı! (${totalFilesCount} Dosya)` : "Gerçek Analiz Raporu Hazır!"}
                </span>
                {analysisResult && (
                  <Badge variant={analysisResult.severity?.toLowerCase().includes("kritik") ? "destructive" : "success"}>
                    {isZipMode ? `${completedCount} Dosya Tarandı` : (analysisResult.severity || "Tamamlandı")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 max-w-xl">
                {isZipMode 
                  ? `'${batchInfo?.projectName}' projesindeki tüm dosyalar PgVector'a işlendi ve güvenlik yamaları oluşturuldu.`
                  : (analysisResult?.aiSuggestion || "Analiz başarıyla tamamlandı.")}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Yeni Yükleme</span>
              </Button>

              <Button
                variant="cyber"
                size="sm"
                onClick={() => {
                  if (batchInfo?.projectId) {
                    window.location.href = `/dashboard?projectId=${batchInfo.projectId}`
                  } else if (analysisResult?.fileId) {
                    window.location.href = `/dashboard?docId=${analysisResult.fileId}`
                  }
                }}
                className="gap-2 text-xs"
              >
                <span>{isZipMode ? "Tüm Projeyi İncele" : "Dashboard'da İncele"}</span>
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
