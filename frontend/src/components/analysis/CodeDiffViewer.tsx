"use client"

import * as React from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code, Check, Copy, ShieldAlert, Sparkles, Wand2 } from "lucide-react"
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

const sampleOriginalCode = `// Örnek Kod: UserController.cs (SQL Injection Zafiyeti)
[HttpGet("user")]
public async Task<IActionResult> GetUser(string username)
{
    // [KRİTİK HATA]: Doğrudan SQL string birleştirme yapılmış!
    string query = "SELECT * FROM Users WHERE Username = '" + username + "'";
    
    using var cmd = new NpgsqlCommand(query, _dbConnection);
    var reader = await cmd.ExecuteReaderAsync();
    
    if (reader.Read())
    {
        return Ok(new { Username = reader["Username"] });
    }
    return NotFound();
}`

const sampleSuggestedCode = `// [AI ÇÖZÜMÜ]: Parametreli Sorgu Kullanımı (Parameterized Query)
[HttpGet("user")]
public async Task<IActionResult> GetUser(string username)
{
    // Güvenli: Parametre kullanımı ile SQL Injection engellendi
    string query = "SELECT * FROM Users WHERE Username = @username";
    
    using var cmd = new NpgsqlCommand(query, _dbConnection);
    cmd.Parameters.AddWithValue("@username", username);
    
    var reader = await cmd.ExecuteReaderAsync();
    
    if (reader.Read())
    {
        return Ok(new { Username = reader["Username"] });
    }
    return NotFound();
}`

export function CodeDiffViewer({
  fileName = "UserController.cs",
  language = "csharp",
  originalCode = sampleOriginalCode,
  suggestedCode = sampleSuggestedCode,
  vulnerableLines = [6, 7],
  vulnerabilityTitle = "SQL Injection (CWE-89)",
  vulnerabilityDescription = "Kullanıcıdan gelen 'username' girdisi doğrudan SQL sorgu metnine eklenmiştir. Parametreli sorgu (prepared statement) kullanılmalıdır.",
}: CodeDiffViewerProps) {
  const [activeTab, setActiveTab] = React.useState<"original" | "fixed">("original")
  const [copied, setCopied] = React.useState<boolean>(false)

  const handleCopy = () => {
    const textToCopy = activeTab === "original" ? originalCode : suggestedCode
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c13] shadow-2xl backdrop-blur-xl">
      {/* Viewer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 bg-[#0f121d] px-5 py-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Code className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-white">{fileName}</span>
              <Badge variant="destructive" className="gap-1 text-[10px] py-0">
                <ShieldAlert className="h-3 w-3" />
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
              <ShieldAlert className="h-3.5 w-3.5" />
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

          <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 px-2.5 text-xs text-zinc-400 hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Vulnerability Alert Box */}
      {activeTab === "original" && (
        <div className="border-b border-rose-500/20 bg-rose-500/5 px-5 py-3 flex items-start gap-3 text-xs text-rose-300">
          <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-rose-200">Zafiyet Detayı:</strong> {vulnerabilityDescription}
          </div>
        </div>
      )}

      {activeTab === "fixed" && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-5 py-3 flex items-start gap-3 text-xs text-emerald-300">
          <Wand2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-200">AI İyileştirmesi:</strong> SQL Injection açığı parametreli sorgu kullanılarak güvenli hale getirilmiştir.
          </div>
        </div>
      )}

      {/* Syntax Highlighted Code Viewer */}
      <div className="overflow-x-auto p-4 text-xs font-mono">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          wrapLines={true}
          lineProps={(lineNumber) => {
            const isVulnerable = activeTab === "original" && vulnerableLines.includes(lineNumber)
            return {
              style: {
                display: "block",
                backgroundColor: isVulnerable ? "rgba(244, 63, 94, 0.18)" : undefined,
                borderLeft: isVulnerable ? "3px solid #f43f5e" : "3px solid transparent",
                paddingLeft: "8px",
              },
            }
          }}
          customStyle={{
            margin: 0,
            background: "transparent",
            fontSize: "12.5px",
            lineHeight: "1.6",
          }}
        >
          {activeTab === "original" ? originalCode : suggestedCode}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
