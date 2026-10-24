"use client"

import { useStoredPreference } from "@/hooks/useStoredPreference"
import * as React from "react"

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useStoredPreference("codemind_sidebar_collapsed", "false")
  const isCollapsed = stored === "true"
  const setIsCollapsed = (value: boolean) => setStored(String(value))
  const toggleSidebar = () => setIsCollapsed(!isCollapsed)

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}
