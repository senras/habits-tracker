import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Flame, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAppStore } from '@/stores/appStore'
import { todayISO } from '@/lib/dates'
import { dayPerformance, getDayScore } from '@/lib/scoring'
import {
  addDaysISO,
  computeStreaks,
  getScheduledHabitsForDay,
  improvementDelta,
  logFor,
} from '@/lib/stats'
import { ProgressControl } from '@/features/habits/progress-control'

export function DashboardView() {
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const setView = useAppStore((s) => s.setView)
  const today = todayISO()

  const score = getDayScore(habits, logs, today)
  const perf = dayPerformance(score)
  const scheduled = getScheduledHabitsForDay(habits, today)
  const weekDelta = improvementDelta(habits, logs, { start: todayISO(), end: todayISO() })
  void weekDelta
  const streaks = computeStreaks(habits, logs)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold capitalize tracking-tight">
        {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
      </h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <ScoreRing perf={perf} earned={score.earned} goal={score.goal} />
            <p className="text-sm text-muted-foreground">
              {score.goal === 0
                ? 'Sin fijos programados hoy'
                : `${Math.round((perf ?? 0) * 100)}% de la meta base`}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Flame
                  className={cn(
                    'size-8',
                    streaks.current > 0 ? 'text-orange-500' : 'text-muted-foreground',
                  )}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Racha actual</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {streaks.current} <span className="text-sm font-normal">días</span>
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Trophy className="size-8 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Racha más larga</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {streaks.longest} <span className="text-sm font-normal">días</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <WeekDeltaInline />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Hábitos de hoy</CardTitle>
            <button
              onClick={() => setView('calendar')}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Ver calendario →
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {scheduled.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{habit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {habit.type === 'fixed' ? 'Fijo' : 'Extra'} · {habit.category}
                </p>
              </div>
              <ProgressControl
                habit={habit}
                date={today}
                log={logFor(logs, habit.id, today)}
              />
            </div>
          ))}
          {scheduled.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay hábitos programados para hoy. Disfruta el descanso o agrega un extra.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function WeekDeltaInline() {
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const end = todayISO()
  const start = addDaysISO(end, -6)
  // compara últimos 7 días contra los 7 anteriores
  const delta = improvementDelta(habits, logs, { start, end })

  return (
    <>
      <div>
        <p className="text-sm font-medium">Mejora semanal</p>
        <p className="text-xs text-muted-foreground">
          Últimos 7 días vs. 7 días anteriores
        </p>
      </div>
      <DeltaBadge deltaPct={delta.deltaPct} />
    </>
  )
}

export function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  const positive = deltaPct >= 0
  return (
    <span
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums',
        positive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400',
      )}
    >
      {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
      {positive ? '+' : ''}
      {deltaPct.toFixed(0)}%
    </span>
  )
}

function ScoreRing({
  perf,
  earned,
  goal,
}: {
  perf: number | null
  earned: number
  goal: number
}) {
  const pct = Math.min(1, Math.max(0, perf ?? 0))
  const R = 52
  const C = 2 * Math.PI * R
  return (
    <div className="relative size-32">
      <svg
        viewBox="0 0 128 128"
        className="-rotate-90"
        role="img"
        aria-label={`Progreso ${earned} de ${goal} puntos`}
      >
        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          className={(perf ?? 0) >= 1 ? 'stroke-emerald-500' : 'stroke-primary'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold tabular-nums">{earned}</span>
        <span className="text-xs text-muted-foreground">/ {goal} pts</span>
      </div>
    </div>
  )
}
