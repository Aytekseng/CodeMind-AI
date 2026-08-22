"use client"

import * as React from "react"
import Link from "next/link"
import { Shield, Sparkles, Bell, ExternalLink, ShieldAlert, CheckCircle2, User, LogOut, Building2, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSignalR, AnalysisResultEvent } from "@/hooks/useSignalR"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

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
  const { latestResult } = useSignalR()
  const { user, isAuthenticated, logout } = useAuth()
  const [notifications, setNotifications] = React.useState<AnalysisResultEvent[]>([])
  const [isNotifOpen, setIsNotifOpen] = React.useState<boolean>(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState<boolean>(false)
  const [unreadCount, setUnreadCount] = React.useState<number>(0)
  
  const notifDropdownRef = React.useRef<HTMLDivElement>(null)
  const userDropdownRef = React.useRef<HTMLDivElement>(null)

  // Listen to SignalR notifications and append to list
  React.useEffect(() => {
    if (latestResult) {
      setNotifications((prev) => [latestResult, ...prev])
      setUnreadCount((prev) => prev + 1)
    }
  }, [latestResult])

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggleNotif = () => {
    setIsNotifOpen((prev) => !prev)
    if (!isNotifOpen) {
      setUnreadCount(0)
    }
  }

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
    toast.info("Oturum kapatıldı.")
  }

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : (user?.email ? user.email.substring(0, 2).toUpperCase() : "CM")

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
        <Badge variant="outline" className="gap-1.5 py-1 px-3 border-cyan-500/30 bg-cyan-500/5 text-cyan-300 hidden sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span>Llama 3 8B RAG Aktif</span>
        </Badge>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleNotif}
            className="relative h-9 w-9 rounded-lg border-white/10 hover:border-cyan-500/40"
          >
            <Bell className="h-4 w-4 text-zinc-400 hover:text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-bounce">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications Popover Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0d101a] shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#121624] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-white text-xs">Canlı AI Bildirimleri</span>
                </div>
                <Badge variant="outline" className="text-[10px] py-0">
                  {notifications.length} Bildirim
                </Badge>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 font-mono text-xs">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">
                    <p className="text-xs">Henüz yeni bir bildirim yok.</p>
                    <p className="text-[11px] text-zinc-600 mt-1">Dosya analizi tamamlandığında burada görünecektir.</p>
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        window.location.href = `/dashboard?docId=${n.fileId}`
                      }}
                      className="p-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          {n.severity?.toLowerCase().includes("kritik") ? (
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span>Analiz Tamamlandı</span>
                        </span>
                        <Badge
                          variant={n.severity?.toLowerCase().includes("kritik") ? "destructive" : "success"}
                          className="text-[10px] py-0"
                        >
                          {n.severity || "Tamam"}
                        </Badge>
                      </div>

                      <p className="text-zinc-400 text-[11px] line-clamp-2">
                        {n.aiSuggestion}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                        <span>{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : ""}</span>
                        <span className="text-cyan-400 flex items-center gap-1 hover:underline">
                          İncele <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auth / User Profile Menu */}
        {isAuthenticated && user ? (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-2.5 py-1.5 transition-all text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-[11px] font-bold text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-white leading-none">
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <p className="text-[10px] text-cyan-400 leading-tight mt-0.5">
                  {user.tenantName || "Şirket"}
                </p>
              </div>
            </button>

            {/* User Popover Panel */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0d101a] shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-2 space-y-1">
                <div className="px-3 py-2.5 border-b border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <Badge variant="outline" className="text-[9px] py-0 border-white/20 text-zinc-400">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  
                  <div className="flex items-center gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] py-0 border-cyan-500/30 text-cyan-300">
                      <Building2 className="h-2.5 w-2.5 mr-1" />
                      {user.tenantName}
                    </Badge>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Oturumu Kapat</span>
                </button>
              </div>
            )}


          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                <LogIn className="h-3.5 w-3.5" />
                <span>Giriş Yap</span>
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5 h-9 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Kayıt Ol</span>
              </Button>
            </Link>
          </div>
        )}

        <a
          href="https://github.com/Aytekseng/CodeMind-AI"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="icon" className="h-9 w-9 border-white/10 hover:border-cyan-500/40">
            <GithubIcon className="h-4 w-4 text-zinc-400 hover:text-white" />
          </Button>
        </a>
      </div>
    </header>
  )
}

