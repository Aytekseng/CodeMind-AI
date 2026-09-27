"use client"

import * as React from "react"
import { useSidebar } from "@/context/SidebarContext"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="relative flex min-h-screen">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "pl-20" : "pl-72"
        )}
      >
        <Header />
        <main className="flex-1 p-8 bg-[#07080c] min-h-[calc(100vh-4.5rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
