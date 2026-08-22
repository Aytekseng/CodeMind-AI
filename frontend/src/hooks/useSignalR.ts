"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import * as signalR from "@microsoft/signalr"
import { toast } from "sonner"

export interface AnalysisResultEvent {
  fileId: string
  severity: string
  aiSuggestion: string
  timestamp: Date
}

export type SignalRStatus = "Connected" | "Connecting" | "Reconnecting" | "Disconnected"

const HUB_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5083"}/analysis-hub`

export function useSignalR() {
  const [status, setStatus] = useState<SignalRStatus>("Connecting")
  const [latestResult, setLatestResult] = useState<AnalysisResultEvent | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const showResultToast = useCallback((result: AnalysisResultEvent) => {
    const isCritical =
      result.severity?.toLowerCase().includes("kritik") ||
      result.severity?.toLowerCase().includes("critical")

    toast(isCritical ? "🚨 Kritik Güvenlik Açığı Tespiti!" : "✨ AI Analizi Tamamlandı", {
      description: `Kritiklik: ${result.severity || "Belirtilmemiş"}\n${result.aiSuggestion?.slice(0, 100)}...`,
      duration: 8000,
      action: {
        label: "Raporu İncele",
        onClick: () => {
          window.location.href = `/dashboard?docId=${result.fileId}`
        },
      },
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    // Hub bağlantısını oluştur
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < 5) return 2000
          if (retryContext.previousRetryCount < 10) return 5000
          return 10000
        },
      })
      .configureLogging(signalR.LogLevel.None) // Konsolu temiz tutmak için
      .build()

    connectionRef.current = connection

    // Olay Dinleyicisi
    connection.on("ReceiveAnalysisResult", (fileId: string, severity: string, aiSuggestion: string) => {
      console.log("[SignalR] ReceiveAnalysisResult alındı:", { fileId, severity, aiSuggestion })
      const event: AnalysisResultEvent = {
        fileId,
        severity,
        aiSuggestion,
        timestamp: new Date(),
      }
      if (isMounted) {
        setLatestResult(event)
        showResultToast(event)
      }
    })

    // Bağlantı durumları
    connection.onreconnecting(() => {
      if (isMounted) setStatus("Reconnecting")
    })

    connection.onreconnected(() => {
      console.log("[SignalR] Yeniden bağlandı!")
      if (isMounted) setStatus("Connected")
    })

    connection.onclose(() => {
      if (isMounted) setStatus("Disconnected")
    })

    // Başlat
    async function start() {
      if (connection.state !== signalR.HubConnectionState.Disconnected) return
      try {
        await connection.start()
        console.log("[SignalR] AnalysisHub bağlantısı aktif: " + HUB_URL)
        if (isMounted) setStatus("Connected")
      } catch (err: any) {
        if (isMounted) setStatus("Disconnected")
        // Arka plan henüz başlamadıysa 3 saniye sonra otomatik tekrar dene
        setTimeout(() => {
          if (isMounted && connection.state === signalR.HubConnectionState.Disconnected) {
            start()
          }
        }, 3000)
      }
    }

    start()

    return () => {
      isMounted = false
      if (connection) {
        connection.stop().catch(() => {})
      }
    }
  }, [showResultToast])

  return {
    status,
    latestResult,
  }
}
