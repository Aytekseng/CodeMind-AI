"use client"

import { useAnalysis, AnalysisResultEvent, SignalRStatus } from "@/context/AnalysisContext"

export type { AnalysisResultEvent, SignalRStatus }

/**
 * Global AnalysisContext üzerinden paylaşılan tekil (singleton) SignalR durumunu döner.
 * Bileşen bazlı gereksiz duplicate WebSocket bağlantılarını ve donmaları önler.
 */
export function useSignalR() {
  const { signalRStatus, latestResult } = useAnalysis()
  return {
    status: signalRStatus,
    latestResult,
  }
}
