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
    // Hub bağlantısını oluştur
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connectionRef.current = connection

    // Olay Dinleyicileri
    connection.on("ReceiveAnalysisResult", (fileId: string, severity: string, aiSuggestion: string) => {
      console.log("[SignalR] ReceiveAnalysisResult alındı:", { fileId, severity, aiSuggestion })
      const event: AnalysisResultEvent = {
        fileId,
        severity,
        aiSuggestion,
        timestamp: new Date(),
      }
      setLatestResult(event)
      showResultToast(event)
    })

    // Bağlantı durum değişimleri
    connection.onreconnecting((error) => {
      console.warn("[SignalR] Yeniden bağlanıyor...", error?.message)
      setStatus("Reconnecting")
    })

    connection.onreconnected((connectionId) => {
      console.log("[SignalR] Yeniden bağlandı! Connection ID:", connectionId)
      setStatus("Connected")
    })

    connection.onclose((error) => {
      console.warn("[SignalR] Bağlantı kapandı.", error?.message)
      setStatus("Disconnected")
    })

    // Bağlantıyı başlat
    async function startConnection() {
      try {
        await connection.start()
        console.log("[SignalR] AnalysisHub bağlantısı başarıyla kuruldu:", HUB_URL)
        setStatus("Connected")
      } catch (err: any) {
        console.warn("[SignalR] Bağlantı henüz kurulamadı (Backend yeniden başlatılıyor olabilir):", err?.message || err)
        setStatus("Disconnected")
      }
    }

    startConnection()

    return () => {
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
