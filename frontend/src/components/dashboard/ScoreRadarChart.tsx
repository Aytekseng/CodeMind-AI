import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
export function ScoreRadarChart({ score }: { score?: number | null }) {
  return <Card className="glass-panel border-white/10">
    <CardHeader><CardTitle className="text-base">Analizlerin güvenlik özeti</CardTitle>
      <CardDescription>Tamamlanan analizlerin zafiyet düzeylerinden hesaplanan gösterge.</CardDescription></CardHeader>
    <CardContent><p className="text-4xl font-semibold text-cyan-400">{score == null ? "—" : `${score}/100`}</p>
      <p className="mt-4 text-xs text-zinc-400">Bu gösterge performans, okunabilirlik veya test kapsamı ölçümü değildir. Ayrıntılı bulguları raporlardan inceleyin.</p></CardContent>
  </Card>
}
