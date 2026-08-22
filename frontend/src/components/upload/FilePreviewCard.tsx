"use client"

import * as React from "react"
import { FileCode2, X, Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilePreviewCardProps {
  file: File
  isUploading: boolean
  uploadStatus: "idle" | "success" | "error"
  errorMessage?: string | null
  onRemove: () => void
  onStartAnalysis: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function getLanguageLabel(fileName: string): { label: string; color: string } {
  const ext = fileName.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "cs":
      return { label: "C#", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
    case "py":
      return { label: "Python", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
    case "js":
      return { label: "JavaScript", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
    case "ts":
      return { label: "TypeScript", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" }
    case "go":
      return { label: "Go", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" }
    case "java":
      return { label: "Java", color: "bg-red-500/20 text-red-400 border-red-500/30" }
    case "cpp":
    case "c":
      return { label: "C/C++", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" }
    case "sql":
      return { label: "SQL", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" }
    default:
      return { label: ext?.toUpperCase() || "CODE", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" }
  }
}

export function FilePreviewCard({
  file,
  isUploading,
  uploadStatus,
  errorMessage,
  onRemove,
  onStartAnalysis,
}: FilePreviewCardProps) {
  const lang = getLanguageLabel(file.name)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d101a]/90 p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* File Details */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <FileCode2 className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm sm:text-base truncate max-w-[240px] sm:max-w-md">
                {file.name}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${lang.color}`}>
                {lang.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span className="text-zinc-400 font-mono">Hazır</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {uploadStatus === "idle" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                disabled={isUploading}
                className="text-zinc-400 hover:text-rose-400 hover:border-rose-500/40"
              >
                <X className="h-4 w-4 mr-1.5" />
                <span>Kaldır</span>
              </Button>

              <Button
                variant="cyber"
                size="sm"
                onClick={onStartAnalysis}
                disabled={isUploading}
                className="gap-2 px-5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-black" />
                    <span>Analizi Başlat</span>
                  </>
                )}
              </Button>
            </>
          )}

          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Kuyruğa Alındı! AI Analizi Bekleniyor...</span>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage || "Yükleme başarısız."}</span>
              </div>
              <Button variant="outline" size="sm" onClick={onRemove}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
