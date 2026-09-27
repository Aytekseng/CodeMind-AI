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
  Zap,
  Activity,
  Cpu,
  Building2,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useSignalR } from "@/hooks/useSignalR"
import { useAuth } from "@/hooks/useAuth"
import { useSidebar } from "@/context/SidebarContext"

const navigation = [
  { name: "Yeni Kod Analizi", href: "/", icon: FileCode2 },
  { name: "Dashboard & Raporlar", href: "/dashboard", icon: LayoutDashboard },
  { name: "Geçmiş Analizler", href: "/history", icon: History },
  { name: "Ayarlar", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { status: signalRStatus } = useSignalR()
  const { user, isAuthenticated } = useAuth()
  const { isCollapsed, toggleSidebar } = useSidebar()

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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-[#090a0f] transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Brand Header & Collapse Toggle */}
      <div className={cn(
        "flex h-18 items-center border-b border-white/10",
        isCollapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#090a0f]">
              <Code2 className="h-5 w-5 text-cyan-400" />
            </div>
          </Link>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">CodeMind</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">AI</span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Siber Güvenlik & Kod Analizi</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-cyan-500/40 hover:text-white transition-colors cursor-pointer",
            isCollapsed && "hidden"
          )}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* When collapsed, show expand button below header */}
      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-white/5">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Menüyü Genişlet"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:border-cyan-500/40 hover:text-white transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className={cn(
        "flex flex-1 flex-col justify-between overflow-y-auto py-5",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <div className="space-y-1">
          {isAuthenticated && user && (
            isCollapsed ? (
              <div
                title={`${user.firstName} ${user.lastName} (${user.tenantName})`}
                className="mb-3 flex justify-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Çalışma Alanı
                  </p>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs font-medium text-white truncate">
                  {user.tenantName || "Şirket"}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
            )
          )}

          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Menü
            </p>
          )}

          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            const isRestricted = !isAuthenticated && item.href !== "/"

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "group flex items-center rounded-lg text-sm font-medium transition-all",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-cyan-400" : "text-zinc-400 group-hover:text-white"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {isRestricted ? (
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                        🔒 Kilitli
                      </span>
                    ) : (
                      isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                      )
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>

        {/* System Status Indicators Box */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="AI Worker Aktif" />
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Kafka Kuyruğu Hazır" />
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  signalRStatus === "Connected"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400"
                )}
                title={`SignalR: ${signalRStatus}`}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0f111a]/80 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                  AI Worker
                </span>
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  Aktif
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  Kuyruk Servisi
                </span>
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  Hazır
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Canlı Bildirim
                </span>
                <Badge variant={getSignalRBadgeVariant()} className="text-[10px] px-1.5 py-0">
                  {signalRStatus === "Connected" ? "Bağlı" : signalRStatus}
                </Badge>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500 font-mono">
              <span>CodeMind AI</span>
              <span>v1.0</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
