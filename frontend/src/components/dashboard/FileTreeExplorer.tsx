"use client"

import * as React from "react"
import { Folder, FolderOpen, FileCode2, Search, ShieldAlert, ShieldCheck, Shield, ChevronRight, ChevronDown, CheckCircle2, Clock } from "lucide-react"
import { ProjectFile } from "@/services/documentService"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FileTreeExplorerProps {
  files: ProjectFile[]
  selectedDocumentId: string | null
  onSelectDocument: (docId: string) => void
  projectName?: string
}

function getSeverityBadge(severity: string) {
  const s = severity?.toLowerCase() || ""
  if (s.includes("kritik") || s.includes("critical")) {
    return { label: "Kritik", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" }
  }
  if (s.includes("yüksek") || s.includes("high")) {
    return { label: "Yüksek", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" }
  }
  if (s.includes("orta") || s.includes("medium")) {
    return { label: "Orta", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" }
  }
  if (s.includes("düşük") || s.includes("low") || s.includes("güvenli")) {
    return { label: "Düşük", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" }
  }
  return { label: "İnceleniyor", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse" }
}

export function FileTreeExplorer({
  files,
  selectedDocumentId,
  onSelectDocument,
  projectName = "Proje Dosyaları",
}: FileTreeExplorerProps) {
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  const filteredFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return files.filter(
      (f) =>
        f.fileName.toLowerCase().includes(query) ||
        f.relativePath.toLowerCase().includes(query) ||
        f.severity.toLowerCase().includes(query)
    )
  }, [files, searchQuery])

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#0c0e17]/90 backdrop-blur-md overflow-hidden">
      {/* Explorer Header */}
      <div className="p-4 border-b border-white/10 bg-[#080a10]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white truncate max-w-[180px]" title={projectName}>
              {projectName}
            </h3>
          </div>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] font-mono">
            {files.length} Dosya
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Dosya veya zafiyet ara..."
            className="w-full rounded-lg bg-zinc-900/80 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px] scrollbar-thin">
        {filteredFiles.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            {searchQuery ? "Aramaya uygun dosya bulunamadı." : "Projede dosya yok."}
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedDocumentId === file.documentId
            const badge = getSeverityBadge(file.severity)

            return (
              <button
                key={file.documentId}
                onClick={() => onSelectDocument(file.documentId)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs group",
                  isSelected
                    ? "bg-cyan-950/40 border border-cyan-500/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "hover:bg-white/5 border border-transparent text-zinc-300 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileCode2
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isSelected ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"
                    )}
                  />
                  <div className="truncate">
                    <div className="font-mono text-xs truncate leading-tight">
                      {file.fileName}
                    </div>
                    {file.relativePath !== file.fileName && (
                      <div className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">
                        {file.relativePath}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border leading-none", badge.color)}>
                    {badge.label}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
