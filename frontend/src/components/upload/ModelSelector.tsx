"use client"

import * as React from "react"
import { Key, Check, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react"

export interface ModelOption {
  id: string
  name: string
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
  {
    id: "llama3",
    name: "Llama 3 8B",
    provider: "Yerel Ollama",
    badge: "Ücretsiz & Yerel",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "🦙",
    description: "Cihazınızda çalışan, GPU hızlandırmalı açık kaynak model. API anahtarı gerekmez.",
    requiresApiKey: false,
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "OpenAI",
    badge: "BYOK",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: "⚡",
    description: "Endüstri lideri mantıksal doğruluk ve en kapsamlı OWASP güvenlik denetimi.",
    requiresApiKey: true,
    keyStorageKey: "codemind_openai_api_key",
    keyPlaceholder: "sk-proj-...",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    badge: "BYOK",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: "🧠",
    description: "Kod analizi ve derin siber zafiyet tespitinde dünyanın en gelişmiş modeli.",
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
  const [showKey, setShowKey] = React.useState<boolean>(false)
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0]

  // Automatically load saved API key from localStorage when model changes
  React.useEffect(() => {
    if (currentModel.requiresApiKey && currentModel.keyStorageKey) {
      const savedKey = localStorage.getItem(currentModel.keyStorageKey) || ""
      onApiKeyChange(savedKey)
    } else {
      onApiKeyChange("")
    }
  }, [currentModel, onApiKeyChange])

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

  return (
    <div className="w-full space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Analiz Yapay Zeka Motoru
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          Seçili: <strong className="text-white font-medium">{currentModel.name}</strong>
        </span>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = selectedModel === model.id
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelectModel(model.id)}
              className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-[#101424] border-cyan-500/40 shadow-[0_0_16px_rgba(6,182,212,0.18)] ring-1 ring-cyan-500/30"
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

              <span
                className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mb-2 font-medium ${model.badgeColor}`}
              >
                {model.badge}
              </span>

              <p className="text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
                {model.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* BYOK API Key Input (Shown only when a cloud model is selected) */}
      {currentModel.requiresApiKey && (
        <div className="rounded-xl border border-white/10 bg-[#0c0e17] p-3.5 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Key className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentModel.provider} API Anahtarı</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Tarayıcınızda yerel saklanır</span>
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

          {!apiKey && (
            <p className="text-[11px] text-amber-400/90 leading-tight">
              ⚠️ {currentModel.name} ile analiz yapabilmek için lütfen kendi {currentModel.provider} API anahtarınızı girin.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
