"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Code2,
  FileCode2,
  LayoutDashboard,
  History,
  Settings,
  ShieldCheck,
  Zap,
  Terminal,
  Activity,
  Cpu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useSignalR } from "@/hooks/useSignalR"

const navigation = [
  { name: "Yeni Kod Analizi", href: "/", icon: FileCode2, current: true },
  { name: "Dashboard & Raporlar", href: "/dashboard", icon: LayoutDashboard },
  { name: "Geçmiş Analizler", href: "/history", icon: History },
  { name: "Canlı AI Terminali", href: "/terminal", icon: Terminal },
  { name: "Ayarlar", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { status: signalRStatus } = useSignalR()

  const getSignalRBadgeVariant = () => {
    switch (signalRStatus) {
      case "Connected":
        return "success"
      case "Connecting":
      case "Reconnecting":
        return "warning"
      default:
        return "destructive"
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#090a0f]/95 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="flex h-18 items-center gap-3 px-6 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090a0f]">
            <Code2 className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white text-base">CodeMind</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">AI</span>
          </div>
          <p className="text-[11px] text-zinc-400">Intelligent Security Audit</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Ana Menü
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-cyan-400" : "text-zinc-400 group-hover:text-white"
                  )}
                />
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}
              </Link>
            )
          })}
        </div>

        {/* System Status Indicators Box */}
        <div className="space-y-3 pt-6 border-t border-white/10">
          <div className="rounded-xl border border-white/10 bg-[#0f111a]/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                AI Worker (Llama 3)
              </span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                Online
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                Kafka Broker
              </span>
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                Ready
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                SignalR Hub
              </span>
              <Badge variant={getSignalRBadgeVariant()} className="text-[10px] px-1.5 py-0">
                {signalRStatus}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500">
            <span>v1.0.0 Alpha</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Clean Arch
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
