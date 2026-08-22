"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface SeverityItem {
  name: string
  count: number
  color: string
}

const defaultData: SeverityItem[] = [
  { name: "Kritik", count: 1, color: "#f43f5e" },
  { name: "Yüksek", count: 3, color: "#f97316" },
  { name: "Orta", count: 5, color: "#eab308" },
  { name: "Düşük / Bilgi", count: 8, color: "#10b981" },
]

export function SeverityBreakdown({ data = defaultData }: { data?: SeverityItem[] }) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <CardTitle className="text-base">Zafiyet Seviyesi Dağılımı</CardTitle>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            Toplam: <strong className="text-white">{total}</strong> Bulgu
          </span>
        </div>
        <CardDescription className="text-xs">
          Tespit edilen güvenlik açıklarının ciddiyet dereceleri
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d101a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-1 flex-col justify-center space-y-2.5 w-full">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-zinc-300">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-white bg-zinc-800/60 px-2 py-0.5 rounded border border-white/5">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
