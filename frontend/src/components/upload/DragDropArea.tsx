"use client"

import * as React from "react"
import { UploadCloud, AlertCircle, FileCode, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { FilePreviewCard } from "@/components/upload/FilePreviewCard"
import { uploadDocumentAsync } from "@/services/documentService"

const ALLOWED_EXTENSIONS = [
  "cs", "py", "js", "jsx", "ts", "tsx", "go", "java", "cpp", "c", "sql", "json", "yml", "yaml", "html", "css"
]
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function DragDropArea() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isDragActive, setIsDragActive] = React.useState<boolean>(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState<boolean>(false)
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [serverMessage, setServerMessage] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const validateAndSetFile = (file: File) => {
    setValidationError(null)
    setUploadStatus("idle")
    setServerMessage(null)

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setValidationError(
        `Desteklenmeyen dosya formatı (.${extension}). Lütfen geçerli bir kod dosyası yükleyin.`
      )
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `Dosya boyutu çok büyük (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maksimum limit: ${MAX_FILE_SIZE_MB} MB.`
      )
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      validateAndSetFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setValidationError(null)
    setUploadStatus("idle")
    setServerMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStartAnalysis = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus("idle")
    setServerMessage(null)

    try {
      const response = await uploadDocumentAsync(selectedFile)
      if (response.isSuccess) {
        setUploadStatus("success")
        setServerMessage(response.message || "Dosya analize alındı!")
      } else {
        setUploadStatus("error")
        setServerMessage(response.error || response.message || "Yükleme sırasında hata oluştu.")
      }
    } catch (err: any) {
      setUploadStatus("error")
      setServerMessage(err?.message || "Sunucu bağlantı hatası.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* File Preview Card (when a file is chosen) */}
      {selectedFile ? (
        <FilePreviewCard
          file={selectedFile}
          isUploading={isUploading}
          uploadStatus={uploadStatus}
          errorMessage={serverMessage}
          onRemove={handleRemoveFile}
          onStartAnalysis={handleStartAnalysis}
        />
      ) : (
        /* Drag and Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer",
            isDragActive
              ? "border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-[0_0_35px_rgba(6,182,212,0.3)]"
              : "border-white/10 bg-[#0c0e17]/80 hover:border-cyan-500/40 hover:bg-[#0f1220]/90"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          />

          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
              isDragActive
                ? "bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            )}
          >
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-white">
            {isDragActive ? "Dosyayı buraya bırakın!" : "Dosyayı buraya sürükleyip bırakın"}
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            veya bilgisayarınızdan seçmek için <span className="text-cyan-400 underline underline-offset-2">tıklayın</span>
          </p>

          {/* Badges of supported extensions */}
          <div className="mt-6 flex flex-wrap justify-center gap-1.5 max-w-md">
            {["C# (.cs)", "Python (.py)", "JavaScript (.js)", "TypeScript (.ts)", "Go (.go)", "SQL (.sql)"].map(
              (lang) => (
                <span
                  key={lang}
                  className="rounded-md bg-zinc-900/90 px-2 py-0.5 text-[11px] font-mono text-zinc-400 border border-zinc-800"
                >
                  {lang}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}
