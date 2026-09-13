"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UploadCloud, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { FilePreviewCard } from "@/components/upload/FilePreviewCard"
import { LoadingTerminal } from "@/components/analysis/LoadingTerminal"
import { uploadDocumentAsync } from "@/services/documentService"
import { useAuth } from "@/hooks/useAuth"
import { useAnalysis } from "@/context/AnalysisContext"
import { toast } from "sonner"

const ALLOWED_EXTENSIONS = [
  "cs", "py", "js", "jsx", "ts", "tsx", "go", "java", "cpp", "c", "sql", "json", "yml", "yaml", "html", "css", "zip"
]
const MAX_SINGLE_FILE_SIZE_MB = 10
const MAX_ZIP_FILE_SIZE_MB = 50

export function DragDropArea() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { session, startAnalysis, setUploadSuccess, setUploadError, resetAnalysis } = useAnalysis()

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [isDragActive, setIsDragActive] = React.useState<boolean>(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [isLocalUploading, setIsLocalUploading] = React.useState<boolean>(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const validateAndSetFile = (file: File) => {
    setValidationError(null)

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setValidationError(
        `Desteklenmeyen dosya formatı (.${extension}). Lütfen geçerli bir kod dosyası veya .ZIP arşivi yükleyin.`
      )
      return
    }

    const maxMb = extension === "zip" ? MAX_ZIP_FILE_SIZE_MB : MAX_SINGLE_FILE_SIZE_MB
    const maxBytes = maxMb * 1024 * 1024

    if (file.size > maxBytes) {
      setValidationError(
        `Dosya boyutu çok büyük (${(file.size / (1024 * 1024)).toFixed(1)} MB). ${extension === "zip" ? "ZIP arşivleri" : "Tekil dosyalar"} için maksimum limit: ${maxMb} MB.`
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

  const handleRemoveSelected = () => {
    setSelectedFile(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleStartAnalysis = async () => {
    if (!selectedFile) return

    if (!isAuthenticated) {
      toast.error("Kod analizi başlatmak için lütfen önce giriş yapın.", {
        action: {
          label: "Giriş Yap",
          onClick: () => router.push("/login"),
        },
      })
      return
    }

    setIsLocalUploading(true)
    startAnalysis(selectedFile.name)

    try {
      console.log("[DragDropArea] Dosya yükleniyor:", selectedFile.name)
      const response = await uploadDocumentAsync(selectedFile)
      console.log("[DragDropArea] API Yanıtı:", response)

      if (response && response.isSuccess) {
        if (response.data?.totalExtractedFiles && response.data.totalExtractedFiles > 0) {
          setUploadSuccess(response.data.documentIds?.[0] || null, {
            projectId: response.data.projectId || "",
            projectName: response.data.projectName || "",
            batchId: response.data.batchId || "",
            totalExtractedFiles: response.data.totalExtractedFiles,
            extractedFiles: response.data.extractedFiles || [],
            documentIds: response.data.documentIds || [],
          })
        } else if (response.data?.documentId) {
          setUploadSuccess(response.data.documentId, null)
        } else {
          setUploadSuccess(null, null)
        }
      } else {
        setUploadError(response?.errors?.[0] || response?.message || "Yükleme sırasında hata oluştu.")
      }
    } catch (err: any) {
      console.error("[DragDropArea] Yükleme hatası:", err)
      setUploadError(err?.message || "Sunucu bağlantı hatası.")
    } finally {
      setIsLocalUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Eğer kalıcı terminal oturumu aktifse (sayfa değiştirilse dahi), LoadingTerminal gösterilir */}
      {session.isAnalyzing ? (
        <LoadingTerminal />
      ) : selectedFile ? (
        /* Henüz analiz başlatılmamışken dosya önizleme kartı */
        <FilePreviewCard
          file={selectedFile}
          isUploading={isLocalUploading}
          uploadStatus="idle"
          onRemove={handleRemoveSelected}
          onStartAnalysis={handleStartAnalysis}
        />
      ) : (
        /* Sürükle-Bırak Alanı */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer",
            isDragActive
              ? "border-cyan-400 bg-cyan-950/20 scale-[1.005] shadow-[0_0_25px_rgba(6,182,212,0.25)]"
              : "border-white/10 bg-[#0c0e17] hover:border-cyan-500/40 hover:bg-[#0f1220]"
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
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
              isDragActive
                ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
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

          {/* Desteklenen uzantı rozetleri */}
          <div className="mt-6 flex flex-wrap justify-center gap-1.5 max-w-lg">
            <span className="rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-mono text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span>📦</span>
              <span>.ZIP Proje Arşivi (Maks 50MB)</span>
            </span>
            {["C# (.cs)", "Python (.py)", "JavaScript (.js)", "TypeScript (.ts)", "Go (.go)", "SQL (.sql)"].map(
              (lang) => (
                <span
                  key={lang}
                  className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-400 border border-zinc-800"
                >
                  {lang}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* Validasyon Hata Mesajı */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-[#150a0d] p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  )
}
