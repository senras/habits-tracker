import { cn } from '@/lib/utils'
import { addDays, format, startOfWeek } from 'date-fns'
import { fromISODate, todayISO } from '@/lib/dates'
import type { Habit, HabitLog } from '@/types/domain'
import { getScheduledHabitsForDay, logFor } from '@/lib/stats'
import { getDayScore } from '@/lib/scoring'
import { ProgressControl } from '@/features/habits/progress-control'
import { es } from 'date-fns/locale'

interface DayCardProps {
  date: string
  habits: Habit[]
  logs: HabitLog[]
  variant?: 'week' | 'month'
}

export function DayCard({ date, habits, logs, variant = 'week' }: DayCardProps) {
  const today = todayISO()
  const isToday = date === today
  const isPast = date < today
  const scheduled = getScheduledHabitsForDay(habits, date)
  const score = getDayScore(habits, logs, date)

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-2 rounded-lg border p-2 transition-colors',
        isPast && !isToday && 'bg-muted/40 opacity-75',
        isToday && 'ring-2 ring-primary',
      )}
    >
      <header className="flex items-baseline justify-between px-0.5">
        <span
          className={cn(
            'text-xs font-medium uppercase tracking-wide text-muted-foreground',
            variant === 'month' && 'hidden',
          )}
        >
          {format(fromISODate(date), 'EEE', { locale: es })}
        </span>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isToday &&
              'flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground',
          )}
        >
          {format(fromISODate(date), 'd')}
        </span>
      </header>

      <div className={cn('flex flex-col gap-1.5', variant === 'week' && 'flex-1')}>
        {scheduled.map((habit) => {
          const log = logFor(logs, habit.id, date)
          return (
            <div key={habit.id} className="flex items-center justify-between gap-2">
              {variant === 'week' ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-xs">{habit.name}</span>
                  <ProgressControl
                    habit={habit}
                    date={date}
                    log={log}
                    disabled={date > today}
                  />
                </>
              ) : (
                <MonthDot status={log?.status} name={habit.name} />
              )}
            </div>
          )
        })}
        {scheduled.length === 0 && (
          <p className="py-1 text-center text-[11px] text-muted-foreground">—</p>
        )}
      </div>

      <footer className="mt-auto border-t pt-1.5">
        <p
          className={cn(
            'text-center font-mono text-xs tabular-nums',
            score.goal > 0 && score.earned >= score.goal && 'font-bold text-emerald-600 dark:text-emerald-400',
          )}
        >
          {score.earned} / {score.goal} pts
        </p>
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
