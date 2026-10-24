"use client"
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import * as signalR from "@microsoft/signalr"
import { toast } from "sonner"
import { cancelDocumentAnalysisAsync } from "@/services/documentService"
import { api, BASE_URL } from "@/services/apiClient"
import { useAuth } from "@/hooks/useAuth"
import { authService } from "@/services/authService"

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


interface AnalysisContextType {
  signalRStatus: SignalRStatus
  latestResult: AnalysisResultEvent | null
  session: AnalysisSessionState
  startAnalysis: (fileName: string, selectedModel?: string) => void
  setUploadSuccess: (documentId: string | null, batchInfo: BatchUploadInfo | null) => void
  setUploadError: (errorMessage: string) => void
  resetAnalysis: () => void
}
interface JobStatus {
  fileId: string; status: string; fileName: string; projectId: string
  modelUsed?: string; errorMessage?: string; severity?: string; aiSuggestion?: string
}
const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return <AnalysisSessionProvider key={user?.userId || "anonymous"}>{children}</AnalysisSessionProvider>
}

function AnalysisSessionProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const [signalRStatus, setSignalRStatus] = useState<SignalRStatus>("Disconnected")
  const [latestResult, setLatestResult] = useState<AnalysisResultEvent | null>(null)
  const [session, setSession] = useState<AnalysisSessionState>(INITIAL_STATE)
  const notified = useRef(new Set<string>())
  const applyStatus = useCallback((job: JobStatus) => {
    if (!["Completed", "Failed", "Cancelled"].includes(job.status)) return
    const event: AnalysisResultEvent = { fileId: job.fileId, severity: job.severity || job.status,
      aiSuggestion: job.aiSuggestion || job.errorMessage || "İşlem sonlandırıldı.", fileName: job.fileName,
      projectId: job.projectId, modelUsed: job.modelUsed, timestamp: new Date() }
    if (!notified.current.has(job.fileId)) { notified.current.add(job.fileId); setLatestResult(event) }
    setSession(prev => {
      const ids = prev.batchInfo?.documentIds || (prev.documentId ? [prev.documentId] : [])
      if (!prev.isAnalyzing || !ids.includes(job.fileId) || prev.completedFiles[job.fileId]) return prev
      const completedFiles = { ...prev.completedFiles, [job.fileId]: { severity: event.severity,
        aiSuggestion: event.aiSuggestion, fileName: job.fileName, modelUsed: job.modelUsed } }
      const allDone = ids.every(id => completedFiles[id])
      return { ...prev, completedFiles, isCompleted: allDone, latestResult: event,
        uploadError: allDone && Object.values(completedFiles).some(f => ["Failed", "Cancelled"].includes(f.severity)) ? "Bazı dosyalar analiz edilemedi veya iptal edildi. Ayrıntılar işlem günlüğünde." : prev.uploadError,
        logs: [...prev.logs, { id: Date.now(), prefix: `[${Object.keys(completedFiles).length}/${ids.length}]`,
          message: `${job.fileName}: ${event.severity}`, type: job.status === "Completed" ? "success" : "error" }] }
    })
  }, [])

  useEffect(() => {
    if (!token || user?.mustChangePassword) return
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/analysis-hub`, { accessTokenFactory: () => authService.getStoredToken() || "" })
      .withAutomaticReconnect().configureLogging(signalR.LogLevel.None).build()
    connection.on("ReceiveAnalysisResult", (fileId: string, severity: string, aiSuggestion: string, fileName: string, projectId: string, modelUsed: string) =>
      applyStatus({ fileId, severity, aiSuggestion, fileName, projectId, modelUsed, status: "Completed" }))
    connection.on("ReceiveAnalysisFailure", (fileId: string, errorMessage: string, fileName: string, projectId: string, modelUsed: string) =>
      applyStatus({ fileId, errorMessage, fileName, projectId, modelUsed, status: "Failed" }))
    connection.onreconnecting(() => { if (active) setSignalRStatus("Reconnecting") })
    connection.onreconnected(() => { if (active) setSignalRStatus("Connected") })
    connection.onclose(() => { if (active) setSignalRStatus("Disconnected") })
    const connect = async () => {
      try { await connection.start(); if (active) setSignalRStatus("Connected") }
      catch { if (active) { setSignalRStatus("Disconnected"); retry = setTimeout(connect, 5000) } }
    }
    void connect()
    return () => { active = false; clearTimeout(retry); void connection.stop() }
  }, [token, user?.mustChangePassword, applyStatus])

  // Reconcile persisted results after missed/early WebSocket events or reconnection.
  useEffect(() => {
    if (!token || !session.isAnalyzing || session.isCompleted || session.isUploading) return
    const ids = session.batchInfo?.documentIds || (session.documentId ? [session.documentId] : [])
    if (!ids.length) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const jobs = await api.post<JobStatus[]>("/api/Document/status", ids)
        if (active) jobs.forEach(applyStatus)
      } catch { /* A transient outage is retried; 401 clears the auth context. */ }
      if (active) timer = setTimeout(poll, 5000)
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [token, session.isAnalyzing, session.isCompleted, session.isUploading, session.documentId, session.batchInfo, applyStatus])

  const startAnalysis = useCallback((fileName: string, selectedModel?: string) => {
    setSession({ ...INITIAL_STATE, fileName, selectedModel, isAnalyzing: true, isUploading: true,
      logs: [{ id: Date.now(), prefix: "[YÜKLEME]", message: `${fileName} yükleniyor.`, type: "system" }] })
  }, [])
  const setUploadSuccess = useCallback((documentId: string | null, batchInfo: BatchUploadInfo | null) => {
    setSession(prev => ({ ...prev, documentId, batchInfo, isUploading: false, uploadSuccess: true,
      logs: [...prev.logs, { id: Date.now(), prefix: "[KUYRUK]", message: "Yükleme kaydedildi. Analiz sonucu bekleniyor.", type: "system" }] }))
  }, [])
  const setUploadError = useCallback((message: string) => {
    setSession(prev => ({ ...prev, isUploading: false, uploadError: message,
      logs: [...prev.logs, { id: Date.now(), prefix: "[HATA]", message, type: "error" }] }))
  }, [])
  const resetAnalysis = useCallback(() => {
    if (session.isUploading) { toast.info("Yükleme tamamlanana kadar bekleyin."); return }
    const ids = session.batchInfo?.documentIds || (session.documentId ? [session.documentId] : [])
    const reset = async () => {
      try {
        if (!session.isCompleted) {
          const results = await Promise.all(ids.map(cancelDocumentAnalysisAsync))
          if (results.some(r => !r.isSuccess)) throw new Error("İptal tamamlanamadı.")
        }
        setSession(INITIAL_STATE)
      } catch { toast.error("İptal isteği başarısız. İşlem durumunu kontrol edip tekrar deneyin.") }
    }
    void reset()
  }, [session.batchInfo, session.documentId, session.isCompleted, session.isUploading])
  return <AnalysisContext.Provider value={{ signalRStatus, latestResult, session, startAnalysis, setUploadSuccess, setUploadError, resetAnalysis }}>{children}</AnalysisContext.Provider>
}
export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) throw new Error("AnalysisProvider gerekli")
  return context
}
