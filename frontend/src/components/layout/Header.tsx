"use client"

import * as React from "react"
import { Shield, Sparkles, Bell, GitFork } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-18 w-full items-center justify-between border-b border-white/10 bg-[#090a0f]/80 px-8 backdrop-blur-xl">
      {/* Left breadcrumb / title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Yapay Zeka Destekli Siber Güvenlik & Kod Analizi</h1>
          <p className="text-xs text-zinc-400">RAG Tabanlı Otomatik Kod İnceleme ve Açık Tespiti</p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-1.5 py-1 px-3 border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>Llama 3 8B RAG Aktif</span>
        </Badge>

        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
          <Bell className="h-4 w-4 text-zinc-400 hover:text-white" />
        </Button>

        <a
          href="https://github.com/Aytekseng/CodeMind-AI"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
            <GithubIcon className="h-4 w-4" />
            <span>GitHub</span>
          </Button>
        </a>
      </div>
    </header>
  )
}
