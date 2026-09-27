"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import * as signalR from "@microsoft/signalr"
import { toast } from "sonner"

export interface AnalysisResultEvent {
  fileId: string
  severity: string
  aiSuggestion: string
  fileName?: string
  projectId?: string
  modelUsed?: string
  timestamp: Date
}

export type SignalRStatus = "Connected" | "Connecting" | "Reconnecting" | "Disconnected"

export interface LogLine {
  id: number
  prefix: string
  message: string
  type: "system" | "kafka" | "worker" | "ai" | "success" | "error"
}

export interface BatchUploadInfo {
  projectId: string
  projectName: string
  batchId: string
  totalExtractedFiles: number
  extractedFiles: string[]
  documentIds: string[]
}

export interface CompletedFileInfo {
  severity: string
  aiSuggestion: string
  fileName?: string
  modelUsed?: string
}

export interface AnalysisSessionState {
  fileName: string | null
  selectedModel?: string
  isAnalyzing: boolean
  isUploading: boolean
  uploadSuccess: boolean
  uploadError: string | null
  documentId: string | null
  batchInfo: BatchUploadInfo | null
  logs: LogLine[]
  isCompleted: boolean
  completedFiles: Record<string, CompletedFileInfo>
  latestResult: AnalysisResultEvent | null
}

const INITIAL_STATE: AnalysisSessionState = {
  fileName: null,
  isAnalyzing: false,
  isUploading: false,
  uploadSuccess: false,
  uploadError: null,
  documentId: null,
  batchInfo: null,
  logs: [],
  isCompleted: false,
  completedFiles: {},
  latestResult: null,
}

const STORAGE_KEY = "codemind_terminal_session_v1"

interface AnalysisContextType {
  // SignalR
  signalRStatus: SignalRStatus
  latestResult: AnalysisResultEvent | null

  // Terminal Session State
  session: AnalysisSessionState
  startAnalysis: (fileName: string, selectedModel?: string) => void
  setUploadSuccess: (documentId: string | null, batchInfo: BatchUploadInfo | null) => void
  setUploadError: (errorMessage: string) => void
  resetAnalysis: () => void
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

const HUB_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5083"}/analysis-hub`

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  // 1. Single Singleton SignalR Connection
  const [signalRStatus, setSignalRStatus] = useState<SignalRStatus>("Connecting")
  const [latestResult, setLatestResult] = useState<AnalysisResultEvent | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  // 2. Terminal Session State with SessionStorage Persistence
  const [session, setSession] = useState<AnalysisSessionState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          return JSON.parse(saved)
        }
      } catch (err) {
        console.warn("[AnalysisContext] Oturum okunamadı:", err)
      }
    }
    return INITIAL_STATE
  })

  // Save to sessionStorage whenever session changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (session.isAnalyzing || session.logs.length > 0) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      } catch (err) {
        console.warn("[AnalysisContext] Oturum kaydedilemedi:", err)
      }
    }
  }, [session])

  // Single Shared Toast notification
  const showResultToast = useCallback((result: AnalysisResultEvent) => {
    const isCritical =
      result.severity?.toLowerCase().includes("kritik") ||
      result.severity?.toLowerCase().includes("critical")

    toast(isCritical ? `🚨 Kritik Zafiyet: ${result.fileName || "Kod"}` : `✨ AI Analizi: ${result.fileName || "Kod"}`, {
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

  // 3. Setup Singleton SignalR Connection
  useEffect(() => {
    let isMounted = true

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
      .configureLogging(signalR.LogLevel.None)
      .build()

    connectionRef.current = connection

    connection.on("ReceiveAnalysisResult", (fileId: string, severity: string, aiSuggestion: string, fileName?: string, projectId?: string, modelUsed?: string) => {
      console.log("[SignalR Global] Sonuç alındı:", { fileId, severity, fileName, projectId, modelUsed })
      const event: AnalysisResultEvent = {
        fileId,
        severity,
        aiSuggestion,
        fileName,
        projectId,
        modelUsed: modelUsed || "Llama 3",
        timestamp: new Date(),
      }

      if (isMounted) {
        setLatestResult(event)
        showResultToast(event)

        // Update active terminal session if analyzing
        setSession((prev) => {
          if (!prev.isAnalyzing) return prev

          // Batch mode check
          if (prev.batchInfo && prev.batchInfo.documentIds?.length > 0) {
            const isBatchFile = 
              prev.batchInfo.documentIds.includes(fileId) ||
              (projectId && projectId === prev.batchInfo.projectId)

            if (isBatchFile) {
              const updatedCompleted = {
                ...prev.completedFiles,
                [fileId]: { severity, aiSuggestion, fileName, modelUsed: modelUsed || "Llama 3" }
              }
              const count = Object.keys(updatedCompleted).length
              const fileTitle = fileName ? fileName.split("/").pop() : fileId.slice(0, 8)
              const allDone = count >= prev.batchInfo.totalExtractedFiles

              const newLogs: LogLine[] = [
                ...prev.logs,
                {
                  id: Date.now() + Math.random(),
                  prefix: `[${count}/${prev.batchInfo.totalExtractedFiles}]`,
                  message: `${fileTitle} analizi tamamlandı! [${modelUsed || "Llama 3"}] Sonuç: ${severity || "Normal"}`,
                  type: severity?.toLowerCase().includes("kritik") ? "error" : "success",
                },
              ]

              if (allDone) {
                newLogs.push({
                  id: Date.now() + 999,
                  prefix: "[TAMAMLANDI]",
                  message: `Tüm proje arşivi (${prev.batchInfo.totalExtractedFiles} dosya) başarıyla tarandı ve raporlandı!`,
                  type: "success",
                })
              }

              return {
                ...prev,
                completedFiles: updatedCompleted,
                isCompleted: allDone ? true : prev.isCompleted,
                latestResult: event,
                logs: newLogs,
              }
            }
          }

          // Single file mode
          return {
            ...prev,
            isCompleted: true,
            latestResult: event,
            logs: [
              ...prev.logs,
              {
                id: Date.now() + 10,
                prefix: "[SIGNALR]",
                message: `'ReceiveAnalysisResult' sinyali alındı! (Doküman ID: ${fileId})`,
                type: "system",
              },
              {
                id: Date.now() + 11,
                prefix: "[SUCCESS]",
                message: `Analiz tamamlandı! [${modelUsed || "Llama 3"}] Tespit Edilen Kritiklik: ${severity || "Normal"}`,
                type: "success",
              },
            ],
          }
        })
      }
    })

    connection.onreconnecting(() => {
      if (isMounted) setSignalRStatus("Reconnecting")
    })

    connection.onreconnected(() => {
      if (isMounted) setSignalRStatus("Connected")
    })

    connection.onclose(() => {
      if (isMounted) setSignalRStatus("Disconnected")
    })

    async function start() {
      if (connection.state !== signalR.HubConnectionState.Disconnected) return
      try {
        await connection.start()
        if (isMounted) setSignalRStatus("Connected")
      } catch (err) {
        if (isMounted) setSignalRStatus("Disconnected")
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

  // 4. Session Action Methods
  const startAnalysis = useCallback((fileName: string, selectedModel?: string) => {
    const modelLabel = selectedModel || "Llama 3 (Yerel)"
    const initialLog: LogLine = {
      id: Date.now(),
      prefix: "[HTTP POST]",
      message: `${fileName} dosyası [${modelLabel}] motoruna aktarılıyor...`,
      type: "system",
    }

    setSession({
      fileName,
      selectedModel: modelLabel,
      isAnalyzing: true,
      isUploading: true,
      uploadSuccess: false,
      uploadError: null,
      documentId: null,
      batchInfo: null,
      logs: [initialLog],
      isCompleted: false,
      completedFiles: {},
      latestResult: null,
    })
  }, [])

  const setUploadSuccess = useCallback((documentId: string | null, batchInfo: BatchUploadInfo | null) => {
    setSession((prev) => {
      const newLogs = [...prev.logs]

      if (batchInfo && batchInfo.totalExtractedFiles > 0) {
        newLogs.push(
          {
            id: Date.now() + 1,
            prefix: "[ZIP UNPACK]",
            message: `'${batchInfo.projectName}' arşivinden ${batchInfo.totalExtractedFiles} adet kaynak kod dosyası başarıyla ayıklandı. (node_modules, bin ve ikili dosyalar filtrelendi)`,
            type: "system",
          },
          {
            id: Date.now() + 2,
            prefix: "[MINIO & DB]",
            message: `Tüm dosyalar MinIO nesne deposuna kaydedildi ve PostgreSQL Proje ID (${batchInfo.projectId.slice(0, 8)}...) altına bağlandı.`,
            type: "system",
          },
          {
            id: Date.now() + 3,
            prefix: "[KAFKA BATCH]",
            message: `${batchInfo.totalExtractedFiles} adet 'file-uploads' olayı Kafka analiz kuyruğuna gönderildi.`,
            type: "kafka",
          },
          {
            id: Date.now() + 4,
            prefix: "[WORKER / LLM]",
            message: `Python AI Worker (Llama 3 8B RAG) dosyaları sırayla AST parçalama ve güvenlik taramasına aldı...`,
            type: "ai",
          }
        )
      } else if (documentId) {
        newLogs.push(
          {
            id: Date.now() + 1,
            prefix: "[MINIO & DB]",
            message: `Dosya MinIO nesne depolama alanına ve PostgreSQL'e kaydedildi. (Doküman ID: ${documentId})`,
            type: "system",
          },
          {
            id: Date.now() + 2,
            prefix: "[KAFKA]",
            message: `'file-uploads' olay kuyruğuna mesaj fırlatıldı -> Python AI Worker tetiklendi.`,
            type: "kafka",
          },
          {
            id: Date.now() + 3,
            prefix: "[WORKER / LLM]",
            message: `Llama 3 8B RAG modeli PgVector embedding ve güvenlik analizi yapıyor...`,
            type: "ai",
          }
        )
      }

      return {
        ...prev,
        isUploading: false,
        uploadSuccess: true,
        documentId,
        batchInfo,
        logs: newLogs,
      }
    })
  }, [])

  const setUploadError = useCallback((errorMessage: string) => {
    setSession((prev) => ({
      ...prev,
      isUploading: false,
      uploadSuccess: false,
      uploadError: errorMessage,
      logs: [
        ...prev.logs,
        {
          id: Date.now() + 99,
          prefix: "[ERROR]",
          message: `Yükleme başarısız oldu: ${errorMessage}`,
          type: "error",
        },
      ],
    }))
  }, [])

  const resetAnalysis = useCallback(() => {
    setSession(INITIAL_STATE)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <AnalysisContext.Provider
      value={{
        signalRStatus,
        latestResult,
        session,
        startAnalysis,
        setUploadSuccess,
        setUploadError,
        resetAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error("useAnalysis hook'u bir AnalysisProvider içinde kullanılmalıdır.")
  }
  return context
}
