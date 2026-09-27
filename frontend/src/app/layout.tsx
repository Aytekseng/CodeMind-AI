import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/AuthContext"
import { AnalysisProvider } from "@/context/AnalysisContext"
import { SidebarProvider } from "@/context/SidebarContext"
import { AppLayout } from "@/components/layout/AppLayout"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "CodeMind AI - Yapay Zeka Kod & Güvenlik Analizi",
  description: "Mikroservis ve RAG mimarili otomatik kod inceleme ve siber güvenlik açığı tespit platformu.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-[#07080c] text-zinc-100 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <AnalysisProvider>
              <SidebarProvider>
                <AppLayout>{children}</AppLayout>
                {/* Sonner Global Toast Notifications */}
                <Toaster theme="dark" position="bottom-right" richColors />
              </SidebarProvider>
            </AnalysisProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

