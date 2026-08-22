"use client"

import * as React from "react"
import { Settings, Cpu, HardDrive, Shield, Bell, Key, User, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useAuth } from "@/hooks/useAuth"

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <AuthGuard
      pageTitle="Sistem & Model Ayarları"
      pageDescription="Yapay zeka modeli, donanım optimizasyonları ve şirket entegrasyon parametrelerini düzenlemek için lütfen giriş yapın."
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Sistem & Profil Ayarları</h1>
            <Badge variant="outline" className="text-[11px] gap-1 border-cyan-500/30 text-cyan-300">
              <Settings className="h-3 w-3" />
              <span>Yapılandırma</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kullanıcı profili, yapay zeka modeli ve altyapı parametreleri
          </p>
        </div>

        <div className="space-y-4">
          {/* User & Workspace Profile Card */}
          {user && (
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-base">Kullanıcı & Çalışma Alanı</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Oturum açmış kullanıcı ve bağlı olunan kurumsal workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <p className="font-semibold text-white">{user.firstName} {user.lastName}</p>
                    <p className="text-zinc-400 text-[11px]">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] border-cyan-500/30 text-cyan-300">
                      <Building2 className="h-3 w-3 mr-1" />
                      {user.tenantName}
                    </Badge>
                    <Badge variant="success">{user.role}</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Oturum Durumu:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    ● Aktif Doğrulandı (JWT)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Configuration */}
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-base">LLM Model Yapılandırması</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Kullanılan yapay zeka modeli ve donanım hızlandırma modu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="font-semibold text-white">Aktif Model</p>
                  <p className="text-zinc-400 text-[11px]">Llama 3 8B (Ollama / Local Inference)</p>
                </div>
                <Badge variant="success">Llama 3 8B</Badge>
              </div>

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="font-semibold text-white">GPU Hızlandırma</p>
                  <p className="text-zinc-400 text-[11px]">NVIDIA CUDA / AMD ROCm Donanım Katmanı</p>
                </div>
                <Badge variant="success">Etkin (GPU 0)</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Context Penceresi (VRAM Optimizasyonu)</p>
                  <p className="text-zinc-400 text-[11px]">num_ctx: 2048 token</p>
                </div>
                <Badge variant="outline">2048 Tokens</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Backend & Broker Settings */}
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base">Bağlantı & Uç Noktalar</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Backend API ve SignalR Hub bağlantı adresleri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <p className="font-semibold text-white">.NET Core Web API</p>
                  <p className="text-zinc-400 text-[11px]">http://localhost:5083</p>
                </div>
                <Badge variant="outline">Port 5083</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">SignalR AnalysisHub</p>
                  <p className="text-zinc-400 text-[11px]">http://localhost:5083/analysis-hub</p>
                </div>
                <Badge variant="success">WebSockets Ready</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
