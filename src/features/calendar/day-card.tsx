import { cn } from '@/lib/utils'
import { addDays, format, startOfWeek } from 'date-fns'
import { fromISODate, todayISO } from '@/lib/dates'
import type { Habit, HabitLog } from '@/types/domain'
import { getScheduledHabitsForDay, logFor } from '@/lib/stats'
import { getDayScore } from '@/lib/scoring'
import { ProgressControl } from '@/features/habits/progress-control'
import { es } from 'date-fns/locale'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/appStore'

function getHabitProgressInfo(
  habit: Habit,
  log?: HabitLog,
): { pct: number; text?: string } {
  if (habit.measurementType === 'boolean') {
    const done = (log?.status ?? 'incomplete') !== 'incomplete'
    return { pct: done ? 100 : 0, text: done ? '1/1' : '0/1' }
  }
  if (habit.measurementType === 'percentage') {
    const value = log?.value ?? 0
    const pct = Math.min(100, Math.max(0, Math.round(value)))
    return { pct, text: `${Math.round(value)}/100` }
  }
  const value = log?.value ?? 0
  const target = habit.targetValue > 0 ? habit.targetValue : 1
  const pct = Math.min(100, Math.max(0, Math.round((value / target) * 100)))
  const unit = habit.measurementType === 'time' ? 'm' : ''
  return { pct, text: `${value}/${target}${unit}` }
}

interface DayCardProps {
  date: string
  habits: Habit[]
  logs: HabitLog[]
  variant?: 'week' | 'month'
}

export function DayCard({ date, habits, logs, variant = 'week', className }: DayCardProps & { className?: string }) {
  const today = todayISO()
  const isToday = date === today
  const isPast = date < today
  const scheduled = getScheduledHabitsForDay(habits, date)
  const score = getDayScore(habits, logs, date)
  const setView = useAppStore((s) => s.setView)
  const setHabitDraft = useAppStore((s) => s.setHabitDraft)

  function addHabitForDay() {
    setHabitDraft({ startDate: date })
    setView('habits')
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-1.5 rounded-lg border transition-colors min-w-0',
        variant === 'month' ? 'p-1.5' : 'p-1.5',
        isPast && !isToday && 'bg-muted/40 opacity-75',
        isToday && 'ring-2 ring-primary',
        className,
      )}
    >
      <header className="flex items-baseline justify-between px-0.5">
        <span
          className={cn(
            'text-sm font-medium uppercase tracking-wide text-muted-foreground',
            variant === 'month' && 'hidden',
          )}
        >
          {format(fromISODate(date), 'EEE', { locale: es })}
        </span>
        <span
          className={cn(
            'text-lg font-semibold tabular-nums',
            isToday &&
              'flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground',
          )}
        >
          {format(fromISODate(date), 'd')}
        </span>
      </header>

      <div className={cn('flex flex-col gap-1.5', variant === 'week' && 'flex-1')}>
        {scheduled.map((habit) => {
          const log = logFor(logs, habit.id, date)
          return (
            <div
              key={habit.id}
              className={cn('flex items-center gap-1.5', 'min-w-0')}
            >
              {variant === 'week' ? (
                <div className="flex w-full items-center gap-1 min-w-0">
                  <span
                    className="min-w-0 flex-1 truncate text-[11px] leading-tight"
                    title={habit.name}
                  >
                    {habit.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="h-1 w-7 rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-1 rounded-full',
                          getHabitProgressInfo(habit, log).pct >= 100
                            ? 'bg-emerald-500'
                            : 'bg-primary',
                        )}
                        style={{ width: `${getHabitProgressInfo(habit, log).pct}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-[10px] font-mono tabular-nums text-muted-foreground">
                      {getHabitProgressInfo(habit, log).text}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <ProgressControl
                      habit={habit}
                      date={date}
                      log={log}
                      disabled={date > today}
                      compact
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <MonthDot status={log?.status} name={habit.name} />
                  <span
                    className="min-w-0 flex-1 truncate text-[11px] leading-tight"
                    title={habit.name}
                  >
                    {habit.name}
                  </span>
                </div>
              )}
            </div>
          )
        })}
        {scheduled.length === 0 && (
          <p className="py-0.5 text-center text-sm text-muted-foreground">—</p>
        )}
      </div>

      <footer className="mt-auto border-t pt-0.5">
        {variant === 'week' ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-full justify-center gap-1 text-[10px]"
            onClick={addHabitForDay}
          >
            <PlusCircle className="size-2.5" />
            Añadir
          </Button>
        ) : (
          <p
            className={cn(
              'text-center font-mono text-xs tabular-nums',
              score.goal > 0 && score.earned >= score.goal && 'font-bold text-emerald-600 dark:text-emerald-400',
            )}
          >
            {score.earned} / {score.goal} pts
          </p>
        )}
      </footer>
    </div>
  )
}

function MonthDot({
  status,
  name,
}: {
  status: HabitLog['status'] | undefined
  name: string
}) {
  return (
    <span
      title={`${name}: ${status ?? 'sin registrar'}`}
      aria-label={`${name}: ${status ?? 'sin registrar'}`}
      className={cn(
        'size-1.5 rounded-full',
        status === 'completed' && 'bg-emerald-500',
        status === 'overcompleted' && 'bg-violet-500',
        (!status || status === 'incomplete') && 'bg-muted-foreground/40',
      )}
    />
  )
}

export function weekDaysOf(anchorISO: string): string[] {
  const start = startOfWeek(fromISODate(anchorISO), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}
