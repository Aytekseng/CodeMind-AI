"use client"

import * as React from "react"
import { Key, Check, Eye, EyeOff, ShieldCheck, Sparkles, Zap, Lock, Cpu, Globe } from "lucide-react"

export interface ModelOption {
  id: string
  name: string
  category: "free" | "byok"
  provider: string
  badge: string
  badgeColor: string
  icon: string
  description: string
  requiresApiKey: boolean
  keyStorageKey?: string
  keyPlaceholder?: string
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // 1. ÜCRETSİZ & YEREL MODELLER (API Key Gerekmez)
  {
    id: "llama3",
    name: "Llama 3 8B",
    category: "free",
    provider: "Yerel Ollama",
    badge: "Ücretsiz & Çevrimdışı",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "🦙",
    description: "Cihazınızda çalışan, GPU hızlandırmalı açık kaynak model. API anahtarı gerekmez.",
    requiresApiKey: false,
  },
  {
    id: "qwen2.5-coder",
    name: "Qwen 2.5 Coder 7B",
    category: "free",
    provider: "Yerel Ollama",
    badge: "Kodlama Lideri",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    icon: "💻",
    description: "Kod analizi ve siber güvenlik zafiyetlerinde dünyanın en iyi açık kaynak kodlama modeli.",
    requiresApiKey: false,
  },

  // 2. BULUT & KENDİ API ANAHTARINIZ (BYOK)
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    category: "byok",
    provider: "Google Cloud",
    badge: "BYOK (Google AI Key)",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: "⚡",
    description: "Google AI Studio veya Google Cloud API anahtarınızla gelişmiş mantıksal denetim ve ultra hızlı analiz.",
    requiresApiKey: true,
    keyStorageKey: "codemind_gemini_api_key",
    keyPlaceholder: "AIzaSy...",
  },
  {
    id: "groq-llama3-70b",
    name: "Groq Llama 3.3 70B",
    category: "byok",
    provider: "Groq LPU",
    badge: "Groq Cloud (Ücretsiz Key)",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "🚀",
    description: "Groq Console'dan alabileceğiniz ücretsiz API anahtarıyla saniyede 300+ token hızında anında denetim.",
    requiresApiKey: true,
    keyStorageKey: "codemind_groq_api_key",
    keyPlaceholder: "gsk_...",
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    category: "byok",
    provider: "OpenAI",
    badge: "BYOK (Kendi Keyiniz)",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: "🧠",
    description: "Endüstri lideri mantıksal doğruluk ve en kapsamlı OWASP güvenlik denetimi.",
    requiresApiKey: true,
    keyStorageKey: "codemind_openai_api_key",
    keyPlaceholder: "sk-proj-...",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    category: "byok",
    provider: "Anthropic",
    badge: "BYOK (Kendi Keyiniz)",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: "🛡️",
    description: "Kod analizi ve derin siber zafiyet tespitinde dünyanın en gelişmiş yapay zeka modeli.",
    requiresApiKey: true,
    keyStorageKey: "codemind_anthropic_api_key",
    keyPlaceholder: "sk-ant-api03-...",
  },
]

interface ModelSelectorProps {
  selectedModel: string
  onSelectModel: (modelId: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function ModelSelector({
  selectedModel,
  onSelectModel,
  apiKey,
  onApiKeyChange,
}: ModelSelectorProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "free" | "byok">("all")
  const [showKey, setShowKey] = React.useState<boolean>(false)
  const normalizedSelectedModel = selectedModel === "gemini-1.5-flash" ? "gemini-3.8-flash" : selectedModel
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === normalizedSelectedModel) || AVAILABLE_MODELS[0]

  // Automatically load saved API key from localStorage when model changes
  React.useEffect(() => {
    if (currentModel.requiresApiKey && currentModel.keyStorageKey) {
      const savedKey = localStorage.getItem(currentModel.keyStorageKey) || ""
      onApiKeyChange(savedKey)
    } else {
      onApiKeyChange("")
    }
  }, [currentModel, onApiKeyChange])

  const handleSelectModel = (modelId: string) => {
    localStorage.setItem("codemind_selected_model", modelId)
    onSelectModel(modelId)
  }

  // Save key to localStorage on edit
  const handleKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onApiKeyChange(val)
    if (currentModel.keyStorageKey) {
      if (val) {
        localStorage.setItem(currentModel.keyStorageKey, val)
      } else {
        localStorage.removeItem(currentModel.keyStorageKey)
      }
    }
  }

  const filteredModels = AVAILABLE_MODELS.filter((m) => {
    if (activeTab === "free") return m.category === "free"
    if (activeTab === "byok") return m.category === "byok"
    return true
  })

  return (
    <div className="w-full space-y-4">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Analiz Yapay Zeka Motoru
          </span>
          <span className="hidden sm:inline-block text-[11px] text-zinc-500 font-mono">
            • Seçili: <strong className="text-cyan-300 font-semibold">{currentModel.name}</strong>
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Tümü ({AVAILABLE_MODELS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("free")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === "free"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🎁 Yerel & Ücretsiz ({AVAILABLE_MODELS.filter((m) => m.category === "free").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("byok")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === "byok"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🔑 API Key İle ({AVAILABLE_MODELS.filter((m) => m.category === "byok").length})
          </button>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredModels.map((model) => {
          const isSelected = selectedModel === model.id
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => handleSelectModel(model.id)}
              className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[#101424] border-cyan-500/50 shadow-[0_0_18px_rgba(6,182,212,0.22)] ring-1 ring-cyan-500/40"
                  : "bg-[#0d101a] border-white/10 hover:border-white/20 hover:bg-[#101322]"
              }`}
            >
              {/* Active Indicator Checkmark */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-black">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              )}

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{model.icon}</span>
                <span className="text-xs font-semibold text-white">{model.name}</span>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium ${model.badgeColor}`}
                >
                  {model.badge}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {model.provider}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                {model.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* BYOK API Key Input */}
      {currentModel.requiresApiKey && (
        <div className="rounded-xl border border-white/10 bg-[#0c0e17] p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentModel.provider} API Anahtarınız</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Güvenli & Geçici Kullanım</span>
            </div>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={handleKeyInputChange}
              placeholder={currentModel.keyPlaceholder || "API Anahtarınızı yapıştırın..."}
              className="w-full rounded-lg border border-white/10 bg-[#07080c] px-3 py-2 pr-10 text-xs font-mono text-white placeholder-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            🔒 API anahtarınız sunucu diskine kaydedilmez; yalnızca analiz işlemi sırasında güvenle kullanılır.
          </p>

          {!apiKey && (
            <p className="text-[11px] text-amber-400/90 leading-tight">
              ⚠️ {currentModel.name} ile analiz yapabilmek için lütfen geçerli {currentModel.provider} API anahtarınızı girin.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
