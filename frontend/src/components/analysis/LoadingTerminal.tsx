"use client"

import * as React from "react"
import { Terminal, Shield, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Sparkles, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAnalysis, LogLine } from "@/context/AnalysisContext"

export function LoadingTerminal() {
  const { session, resetAnalysis } = useAnalysis()
  const {
    fileName,
    isUploading,
    uploadSuccess,
    uploadError,
    documentId,
    batchInfo,
    logs,
    isCompleted,
    completedFiles,
    latestResult,
  } = session

  const logsContainerRef = React.useRef<HTMLDivElement>(null)

  const isZipMode = Boolean(batchInfo && batchInfo.totalExtractedFiles > 1)
  const totalFilesCount = batchInfo?.totalExtractedFiles || 1
  const completedCount = Object.keys(completedFiles || {}).length
  const progressPercent = Math.min(100, Math.round((completedCount / totalFilesCount) * 100))

  const activeModelLabel = latestResult?.modelUsed || (
    session.selectedModel === "gemini-1.5-flash" ? "Gemini 1.5 Flash" :
    session.selectedModel === "groq-llama3-70b" ? "Groq Llama 3.3 70B" :
    session.selectedModel === "qwen2.5-coder" ? "Qwen 2.5 Coder" :
    session.selectedModel === "gpt-4o" ? "OpenAI GPT-4o" :
    session.selectedModel === "claude-3-5-sonnet" ? "Claude 3.5 Sonnet" :
    "Llama 3"
  )

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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#07090e] shadow-xl">
      {/* Terminal Window Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0d101a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500/80" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-mono text-xs text-zinc-400 flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-xs">
            <Terminal className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            codemind-ai-engine ~ {fileName || "kod-analizi"}
          </span>
          <Badge variant="outline" className="hidden sm:inline-flex border-cyan-500/20 bg-cyan-950/40 text-cyan-300 text-[10px] font-mono py-0 px-2">
            🤖 {activeModelLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {uploadError ? (
            <Badge variant="destructive" className="gap-1 text-[11px]">
              <AlertTriangle className="h-3 w-3" />
              <span>Analiz İptal Edildi</span>
            </Badge>
          ) : isCompleted ? (
            <Badge variant="success" className="gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              <span>{isZipMode ? "Tüm Proje Tarandı" : "Analiz Bitti"}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px]">
              <Sparkles className="h-3 w-3 text-cyan-400 animate-spin" />
              <span>
                {isUploading
                  ? "Arşiv Yükleniyor..."
                  : isZipMode
                  ? `Taranıyor (${completedCount}/${totalFilesCount})`
                  : "AI Analiz Ediyor..."}
              </span>
            </Badge>
          )}
        </div>
      </div>

      {/* Multi-File Progress Bar Header */}
      {isZipMode && (
        <div className="border-b border-white/10 bg-[#0d101a] px-4 py-2.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400 font-mono">
              Proje: <span className="text-cyan-400 font-semibold">{batchInfo?.projectName}</span>
            </span>
            <span className="font-mono text-cyan-400 font-semibold">
              {completedCount} / {totalFilesCount} dosya (%{progressPercent})
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Terminal Log Console */}
      <div
        ref={logsContainerRef}
        className="h-80 overflow-y-auto p-5 font-mono text-xs space-y-2.5 bg-[#05060a] scroll-smooth"
      >
        <p className="text-zinc-500">
          # Canlı Güvenlik Analizi & İşlem Akışı
        </p>

        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-zinc-600 select-none">❯</span>
            <span className={getPrefixColor(log.type)}>{log.prefix}</span>
            <span className="text-zinc-300 break-all">{log.message}</span>
          </div>
        ))}

        {!isCompleted && !uploadError && (
          <div className="flex items-center gap-2 text-cyan-400 animate-pulse pt-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-xs">
              {isZipMode
                ? `Dosyalar analiz ediliyor (${completedCount}/${totalFilesCount})...`
                : "Yapay zeka güvenlik analizi yapılıyor..."}
            </span>
          </div>
        )}
      </div>

      {/* Terminal Bottom Action Area (Always visible when completed or error) */}
      {isCompleted ? (
        <div className="border-t border-white/10 bg-[#0d101a] p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white text-sm">
                  {isZipMode ? `Proje Taraması Tamamlandı! (${totalFilesCount} Dosya)` : "Analiz Raporu Hazır!"}
                </span>
                {latestResult && (
                  <Badge variant={latestResult.severity?.toLowerCase().includes("kritik") ? "destructive" : "success"}>
                    {isZipMode ? `${completedCount} Dosya Tarandı` : (latestResult.severity || "Tamamlandı")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 max-w-xl">
                {isZipMode
                  ? `'${batchInfo?.projectName}' projesindeki tüm dosyalar tarandı ve güvenlik raporu oluşturuldu.`
                  : (latestResult?.aiSuggestion || "Analiz başarıyla tamamlandı.")}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* BUTON: Kullanıcı bu butona basana kadar terminal asla kapanmaz ve yazılar gitmez! */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetAnalysis}
                className="gap-2 text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
              >
                <UploadCloud className="h-4 w-4 text-cyan-400" />
                <span>Yeni Dosya Yükle</span>
              </Button>

              <Button
                variant="cyber"
                size="sm"
                onClick={() => {
                  if (batchInfo?.projectId) {
                    window.location.href = `/dashboard?projectId=${batchInfo.projectId}`
                  } else if (latestResult?.fileId || documentId) {
                    window.location.href = `/dashboard?docId=${latestResult?.fileId || documentId}`
                  }
                }}
                className="gap-2 text-xs cursor-pointer"
              >
                <span>{isZipMode ? "Tüm Projeyi İncele" : "Dashboard'da İncele"}</span>
                <ArrowRight className="h-3.5 w-3.5 fill-black" />
              </Button>
            </div>
          </div>
        </div>
      ) : uploadError ? (
        <div className="border-t border-rose-500/20 bg-[#150a0d] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="break-all">{uploadError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAnalysis}
            className="text-xs border-rose-500/40 text-rose-300 hover:bg-rose-500/10 cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Yeni Dosya Yükle
          </Button>
        </div>
      ) : (
        /* While analyzing or waiting, provide an explicit reset/cancel button if needed */
        <div className="border-t border-white/5 bg-[#090b12] px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px] text-zinc-400">
            Analiz arka planda devam eder, istediğiniz zaman diğer sayfalara geçebilirsiniz.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAnalysis}
            className="text-xs text-zinc-400 hover:text-rose-400 h-7 px-2 cursor-pointer"
          >
            İptal Et / Yeni Yükleme
          </Button>
        </div>
      )}
    </div>
  )
}
