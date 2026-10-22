import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from 'recharts'
import { Flame, Percent, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/appStore'
import type { RangeKey } from '@/lib/stats'
import {
  categoryDistribution,
  computeRates,
  computeStreaks,
  getRange,
  heatmapData,
  improvementDelta,
  type HeatCell,
} from '@/lib/stats'
import { DeltaBadge } from '@/features/dashboard/dashboard-view'

const RANGE_LABELS: Record<RangeKey, string> = {
  week: 'Semanal',
  month: 'Mensual',
  year: 'Anual',
  all: 'Histórico',
}

export function StatsView() {
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const [rangeKey, setRangeKey] = useState<RangeKey>('week')

  const range = useMemo(() => getRange(rangeKey), [rangeKey])
  const rates = useMemo(() => computeRates(habits, logs, range), [habits, logs, range])
  const streaks = useMemo(() => computeStreaks(habits, logs), [habits, logs])
  const categories = useMemo(
    () => categoryDistribution(logs, habits, range),
    [logs, habits, range],
  )
  const delta = useMemo(
    () => improvementDelta(habits, logs, range),
    [habits, logs, range],
  )
  const heat = useMemo(() => heatCellsFor(rangeKey, habits, logs), [rangeKey, habits, logs])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Estadísticas</h1>
        <Tabs value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <TabsList>
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
              <TabsTrigger key={k} value={k}>
                {RANGE_LABELS[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={<Percent className="size-5 text-emerald-500" />}
          label="Completion rate"
          value={`${(rates.completionRate * 100).toFixed(0)}%`}
          hint={`${rates.completedCount}/${rates.scheduledCount} programados`}
        />
        <MetricCard
          icon={<Sparkles className="size-5 text-violet-500" />}
          label="Overcompletion rate"
          value={`${(rates.overcompletionRate * 100).toFixed(0)}%`}
          hint={`${rates.overcompletedCount}/${rates.scheduledCount} programados`}
        />
        <MetricCard
          icon={<Flame className={cn('size-5', streaks.current > 0 ? 'text-orange-500' : 'text-muted-foreground')} />}
          label="Racha actual"
          value={`${streaks.current}`}
          hint={`días perfectos seguidos`}
        />
        <MetricCard
          icon={<Trophy className="size-5 text-amber-500" />}
          label="Racha más larga"
          value={`${streaks.longest}`}
          hint="histórico"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delta de mejora</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Rendimiento promedio del período vs. período anterior equivalente
            ({RANGE_LABELS[rangeKey].toLowerCase()}).
          </p>
          <DeltaBadge deltaPct={delta.deltaPct} />
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Puntos por categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {categories.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="points"
                    nameKey="category"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categories.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(value) => `${value} pts`} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <CategoryLegend categories={categories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Balance por categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {categories.length < 3 ? (
              <EmptyChart message="Se necesitan ≥ 3 categorías para el radar" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categories}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <Radar
                    dataKey="points"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.35}
                  />
                  <ReTooltip formatter={(value) => `${value} pts`} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Heatmap de puntuación</CardTitle>
            <HeatLegend />
          </div>
        </CardHeader>
        <CardContent>
          <Heatmap cells={heat} />
        </CardContent>
      </Card>
    </div>
  )
}

function heatCellsFor(rangeKey: RangeKey, habits: ReturnType<typeof useAppStore.getState>['habits'], logs: ReturnType<typeof useAppStore.getState>['logs']): HeatCell[] {
  if (rangeKey === 'all') {
    const end = new Date()
    const start = new Date(end.getTime() - 364 * 86_400_000)
    return heatmapData(habits, logs, {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    })
  }
  const range = getRange(rangeKey)
  if (rangeKey === 'year') {
    // grilla anual completa sería enorme; mostrar últimas 26 semanas del año
    return heatmapData(habits, logs, {
      start: maxISO(range.start, format(new Date(Date.now() - 181 * 86_400_000), 'yyyy-MM-dd')),
      end: minISO(range.end, format(new Date(), 'yyyy-MM-dd')),
    })
  }
  return heatmapData(habits, logs, range)
}

function maxISO(a: string, b: string): string {
  return a > b ? a : b
}
function minISO(a: string, b: string): string {
  return a < b ? a : b
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        {icon}
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function CategoryLegend({
  categories,
}: {
  categories: { category: string; points: number }[]
}) {
  if (categories.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {categories.map((c, i) => (
        <span key={c.category} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: `var(--chart-${(i % 5) + 1})` }}
          />
          {c.category} ({c.points})
        </span>
      ))}
    </div>
  )
}

const LEVEL_CLASSES: Record<HeatCell['level'], string> = {
  0: 'bg-muted',
  1: 'bg-emerald-200 dark:bg-emerald-950',
  2: 'bg-emerald-300 dark:bg-emerald-800',
  3: 'bg-emerald-500 dark:bg-emerald-600',
  4: 'bg-emerald-600 dark:bg-emerald-400',
}

function Heatmap({ cells }: { cells: HeatCell[] }) {
  const weeks: HeatCell[][] = []
  let currentWeek: HeatCell[] = []
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const dow = (new Date(`${cell.date}T12:00:00`).getDay() + 6) % 7 // lunes=0
    if (i === 0 && dow > 0) {
      for (let p = 0; p < dow; p++) currentWeek.push(undefined as unknown as HeatCell)
    }
    currentWeek.push(cell)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, di) => {
              const cell = week[di]
              if (!cell) return <span key={di} className="size-[13px]" />
              const d = new Date(`${cell.date}T12:00:00`)
              return (
                <Tooltip key={cell.date}>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'size-[13px] rounded-[3px] transition-transform hover:scale-110',
                        LEVEL_CLASSES[cell.level],
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="capitalize">
                    {format(d, "EEE d MMM", { locale: es })}: {cell.earned}/{cell.goal} pts
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatLegend() {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      Menos
      {(Object.keys(LEVEL_CLASSES) as unknown as HeatCell['level'][]).map((lvl) => (
        <span key={lvl} className={cn('size-[11px] rounded-[3px]', LEVEL_CLASSES[lvl])} />
      ))}
      Más
    </span>
  )
}

function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground">
        {message ?? 'Sin datos en este período'}
      </p>
    </div>
  )
}
