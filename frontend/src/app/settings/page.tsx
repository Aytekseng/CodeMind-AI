"use client"

import * as React from "react"
import { Settings, Cpu, User, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { ModelSelector, AVAILABLE_MODELS } from "@/components/upload/ModelSelector"

import { ProfileSettingsCard } from "@/components/settings/ProfileSettingsCard"
import { TeamManagementCard } from "@/components/settings/TeamManagementCard"
import { DangerZoneCard } from "@/components/settings/DangerZoneCard"

export default function SettingsPage() {
  const { user } = useAuth()
  const [selectedModel, setSelectedModel] = React.useState<string>("llama3")
  const [apiKey, setApiKey] = React.useState<string>("")

  React.useEffect(() => {
    const saved = localStorage.getItem("codemind_selected_model") || "llama3"
    setSelectedModel(saved)
    const modelObj = AVAILABLE_MODELS.find((m) => m.id === saved)
    if (modelObj?.keyStorageKey) {
      setApiKey(localStorage.getItem(modelObj.keyStorageKey) || "")
    }
  }, [])

  return (
    <AuthGuard
      pageTitle="Sistem & Model Ayarları"
      pageDescription="Yapay zeka modeli ve hesap ayarlarını yönetmek için lütfen giriş yapın."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Ayarlar</h1>
            <Badge variant="outline" className="text-[11px] gap-1 border-cyan-500/30 text-cyan-300">
              <Settings className="h-3 w-3" />
              <span>Yapılandırma</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Analiz yapay zeka modelinizi ve profil bilgilerinizi buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="space-y-6">
          {/* User & Workspace Profile Interactive Card */}
          <ProfileSettingsCard />

          {/* Team & Member Access Management Card (Only visible to Admin) */}
          <TeamManagementCard />

          {/* Model Configuration Card */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <CardTitle className="text-sm font-semibold">Yapay Zeka Modeli & Analiz Motoru</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Kod analizinde kullanılacak varsayılan yapay zeka modelini seçin ve gerekiyorsa API anahtarınızı tanımlayın.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
              />
            </CardContent>
          </Card>

          {/* Critical Workspace & Data Offboarding (Only visible to Admin) */}
          <DangerZoneCard />
        </div>
      </div>
    </AuthGuard>
  )
}
