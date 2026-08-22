"use client"

import * as React from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

interface ScoreData {
  subject: string
  score: number
  fullMark: number
}

const defaultScores: ScoreData[] = [
  { subject: "Güvenlik (Security)", score: 92, fullMark: 100 },
  { subject: "Performans", score: 85, fullMark: 100 },
  { subject: "Mimari Uyum", score: 88, fullMark: 100 },
  { subject: "Okunabilirlik", score: 90, fullMark: 100 },
  { subject: "Temiz Kod", score: 82, fullMark: 100 },
  { subject: "Test Edilebilirlik", score: 75, fullMark: 100 },
]

export function ScoreRadarChart({ scores = defaultScores }: { scores?: ScoreData[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-base">Kod Kalite & Güvenlik Radarı</CardTitle>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Genel Skor: 85/100
          </span>
        </div>
        <CardDescription className="text-xs">
          Yapay zekanın kod mimarisi ve zafiyet analiz metrikleri dağılımı
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={scores}>
            <PolarGrid stroke="#1f293d" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
            <Radar
              name="Skor"
              dataKey="score"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
