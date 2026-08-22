"use client"

import * as React from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code, Check, Copy, ShieldAlert, Sparkles, ShieldCheck, FileCode2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CodeDiffViewerProps {
  fileName?: string
  language?: string
  originalCode?: string
  suggestedCode?: string
  vulnerableLines?: number[]
  vulnerabilityTitle?: string
  vulnerabilityDescription?: string
}

export function CodeDiffViewer({
  fileName = "CodeFile.cs",
  language = "csharp",
  originalCode = "// Orijinal kod içeriği...",
  suggestedCode = "// Yapay zeka çözüm önerisi...",
  vulnerableLines = [],
  vulnerabilityTitle = "Güvenlik İncelemesi",
  vulnerabilityDescription = "",
}: CodeDiffViewerProps) {
  const [activeTab, setActiveTab] = React.useState<"original" | "fixed">("original")
  const [copied, setCopied] = React.useState<boolean>(false)

  const handleCopy = () => {
    const textToCopy = activeTab === "original" ? originalCode : suggestedCode
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLanguageForPrism = (lang: string) => {
    const l = (lang || "").toLowerCase()
    if (l.includes("c#") || l.includes("csharp") || l.includes("cs")) return "csharp"
    if (l.includes("python") || l.includes("py")) return "python"
    if (l.includes("javascript") || l.includes("js")) return "javascript"
    if (l.includes("typescript") || l.includes("ts")) return "typescript"
    if (l.includes("go")) return "go"
    if (l.includes("java")) return "java"
    if (l.includes("sql")) return "sql"
    if (l.includes("html")) return "html"
    if (l.includes("css")) return "css"
    if (l.includes("json")) return "json"
    return "csharp"
  }

  const prismLanguage = getLanguageForPrism(language)

  const isCritical =
    vulnerabilityTitle?.toLowerCase().includes("kritik") ||
    vulnerabilityTitle?.toLowerCase().includes("critical") ||
    vulnerabilityTitle?.toLowerCase().includes("yüksek") ||
    vulnerabilityTitle?.toLowerCase().includes("high")

  return (
    <div className="relative flex flex-col h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c13] shadow-2xl backdrop-blur-xl">
      {/* Viewer Header */}
      <div className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 bg-[#0f121d] px-5 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Code className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-white">{fileName}</span>
              <Badge
                variant={isCritical ? "destructive" : "success"}
                className="gap-1 text-[10px] py-0"
              >
                {isCritical ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                {vulnerabilityTitle}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-black/40 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab("original")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                activeTab === "original"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>Mevcut Kod</span>
            </button>
            <button
              onClick={() => setActiveTab("fixed")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                activeTab === "fixed"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>AI Çözüm Önerisi</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            title="Kopyala"
            className="h-8 px-2.5 text-xs text-zinc-400 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Sub-header Context Bar */}
      {activeTab === "original" ? (
        <div className="shrink-0 border-b border-white/5 bg-white/[0.02] px-5 py-2.5 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
            <FileCode2 className="h-3.5 w-3.5 text-cyan-400" />
            Orijinal Dosya Kaynak Kodu
          </span>
          <span className="text-[11px] text-zinc-500">
            AI analizini görmek için <strong className="text-emerald-400 font-medium">"AI Çözüm Önerisi"</strong> sekmesine geçin
          </span>
        </div>
      ) : (
        <div className="shrink-0 border-b border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-300">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Llama 3 8B Güvenlik Yaması & Zafiyet Detayı
          </span>
          <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
            RAG Analiz Çıktısı
          </Badge>
        </div>
      )}

      {/* Scrollable Content Body with Fixed Height */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-0">
        {activeTab === "original" ? (
          /* Mevcut Kod: Only raw source code with syntax highlighting */
          <SyntaxHighlighter
            language={prismLanguage}
            style={vscDarkPlus}
            showLineNumbers
            wrapLines
            lineProps={(lineNumber) => {
              const style: React.CSSProperties = { display: "block" }
              if (vulnerableLines.includes(lineNumber)) {
                style.backgroundColor = "rgba(244, 63, 94, 0.2)"
                style.borderLeft = "3px solid #f43f5e"
                style.paddingLeft = "8px"
              }
              return { style }
            }}
            customStyle={{
              margin: 0,
              padding: "1.25rem",
              background: "transparent",
              fontSize: "0.75rem",
              lineHeight: "1.6",
            }}
          >
            {originalCode}
          </SyntaxHighlighter>
        ) : (
          /* AI Çözüm Önerisi: Vulnerability explanation + AI Refactor output */
          <div className="p-5 space-y-4">
            {vulnerabilityDescription && (
              <div className="rounded-xl bg-black/60 border border-emerald-500/20 p-4 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {vulnerabilityDescription}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
