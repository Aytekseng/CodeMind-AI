"use client"

import * as React from "react"
import Link from "next/link"
import { UploadCloud, ShieldAlert, Cpu, Sparkles, ArrowRight, CheckCircle2, Lock, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DragDropArea } from "@/components/upload/DragDropArea"
import { useAuth } from "@/hooks/useAuth"

export default function Home() {
  const { isAuthenticated, user } = useAuth()

  const scrollToUpload = () => {
    const el = document.getElementById("upload-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Guest Mode Restriction Notice Banner */}
      {!isAuthenticated && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-200">
                Misafir Modundasınız (Kısıtlı Erişim)
              </p>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Kod analizi başlatmak, şirket arşivi oluşturmak ve güvenlik dashboard'una erişmek için oturum açmalısınız.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/20">
                <LogIn className="h-3 w-3 mr-1" />
                Giriş Yap
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto text-xs h-8 bg-amber-500 text-black hover:bg-amber-400 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                <UserPlus className="h-3 w-3 mr-1" />
                Kayıt Ol
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1220]/90 to-[#090b12]/90 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge variant="default" className="gap-1.5 py-1 px-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CodeMind AI v1.0 Production Ready</span>
          </Badge>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Kaynak Kodlarınızı <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Yapay Zeka ile Denetleyin</span>
          </h1>

          <p className="text-sm leading-relaxed text-zinc-400">
            C#, Python, JavaScript ve daha fazlası. Kod dosyalarınızı yükleyin; mikroservis tabanlı AI işçimiz (Llama 3 8B) güvenlik açıklarını, performans darboğazlarını ve mimari hataları saniyeler içinde tespit etsin.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="cyber" size="lg" onClick={scrollToUpload} className="gap-2 cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>Analize Başla</span>
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="gap-2 cursor-pointer">
                <span>Mimari Raporunu İncele</span>
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </Button>
            </Link>
          </div>
        </div>
      </div>


      {/* Upload Box Section */}
      <div id="upload-section" className="space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Kod Dosyası Yükleme</h2>
            <p className="text-xs text-zinc-400">Tekil kod dosyanızı (.cs, .py, .js, .ts vb.) analiz için bırakın veya seçin.</p>
          </div>
          <Badge variant="success" className="text-xs">Sürükle-Bırak & Otomatik AI Analizi</Badge>
        </div>

        {/* Interactive Drag & Drop Area */}
        <DragDropArea />
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card className="glass-panel glass-panel-hover">
          <CardHeader className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <CardTitle>Siber Güvenlik Açığı Tespiti</CardTitle>
            <CardDescription>
              SQL Injection, XSS, Hardcoded Secret ve OWASP Top 10 zafiyetlerini anında yakalar.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass-panel glass-panel-hover">
          <CardHeader className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="h-4 w-4" />
            </div>
            <CardTitle>PgVector & RAG Mimarisi</CardTitle>
            <CardDescription>
              Kodunuz vektörel parçalara bölünür ve Llama 3 8B ile derin anlamsal bağlam kurulur.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="glass-panel glass-panel-hover">
          <CardHeader className="space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <CardTitle>Olay Güdümlü & SignalR</CardTitle>
            <CardDescription>
              Apache Kafka kuyruk yapısı ve SignalR WebSockets ile anlık canlı bildirimler.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
