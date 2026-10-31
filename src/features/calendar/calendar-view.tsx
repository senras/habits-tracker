import { addDays, addMonths, format, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/stores/appStore'
import { todayISO } from '@/lib/dates'
import { DayCard, weekDaysOf } from './day-card'

const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function CalendarView() {
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const calendarMode = useAppStore((s) => s.calendarMode)
  const setCalendarMode = useAppStore((s) => s.setCalendarMode)
  const anchorDate = useAppStore((s) => s.anchorDate)
  const setAnchorDate = useAppStore((s) => s.setAnchorDate)

  const today = todayISO()

  function shift(dir: -1 | 1) {
    if (calendarMode === 'week') {
      setAnchorDate(format(addDays(anchorDate, dir * 7), 'yyyy-MM-dd'))
    } else {
      setAnchorDate(format(addMonths(startOfMonth(anchorDate), dir), 'yyyy-MM-dd'))
    }
  }

  function monthCells(): string[] {
    const first = startOfMonth(new Date(`${anchorDate}T12:00:00`))
    const gridStart = startOfWeek(first, { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) =>
      format(addDays(gridStart, i), 'yyyy-MM-dd'),
    )
  }

  const rangeLabel =
    calendarMode === 'week'
      ? formatWeekRange(weekDaysOf(anchorDate))
      : format(startOfMonth(new Date(`${anchorDate}T12:00:00`)), 'MMMM yyyy', { locale: es })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold capitalize tracking-tight">{rangeLabel}</h1>
        <div className="flex items-center gap-2">
          <Tabs value={calendarMode} onValueChange={(v) => setCalendarMode(v as 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Período anterior"
              onClick={() => shift(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={anchorDate === today}
              onClick={() => setAnchorDate(today)}
            >
              Hoy
            </Button>
            <Button variant="outline" size="icon" aria-label="Período siguiente" onClick={() => shift(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      {calendarMode === 'week' ? (
        <div className="w-full">
          <div className="mb-1 hidden grid-cols-7 gap-1.5 xl:grid">
            {WEEKDAYS_SHORT.map((d) => (
              <p key={d} className="text-center text-sm font-medium uppercase text-muted-foreground">
                {d}
              </p>
            ))}
          </div>
          <div className="hidden xl:grid xl:grid-cols-5 xl:grid-rows-2 gap-1.5">
            {weekDaysOf(anchorDate)
              .slice(0, 4)
              .map((date) => (
                <DayCard key={date} date={date} habits={habits} logs={logs} variant="week" />
              ))}
            <DayCard
              key={weekDaysOf(anchorDate)[4]}
              date={weekDaysOf(anchorDate)[4]}
              habits={habits}
              logs={logs}
              variant="week"
              className="col-start-1 row-start-2"
            />
            <DayCard
              key={weekDaysOf(anchorDate)[5]}
              date={weekDaysOf(anchorDate)[5]}
              habits={habits}
              logs={logs}
              variant="week"
              className="col-start-2 row-start-2"
            />
            <DayCard
              key={weekDaysOf(anchorDate)[6]}
              date={weekDaysOf(anchorDate)[6]}
              habits={habits}
              logs={logs}
              variant="week"
              className="col-start-3 row-start-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4 xl:hidden">
            {weekDaysOf(anchorDate).map((date) => (
              <DayCard key={date} date={date} habits={habits} logs={logs} variant="week" />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((d) => (
              <p key={d} className="text-center text-xs font-medium uppercase text-muted-foreground">
                {d}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {monthCells().map((date) => (
              <DayCard key={date} date={date} habits={habits} logs={logs} variant="month" />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Completado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-500" /> Sobre-cumplido
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="size-3" /> Puntos del día en cada celda
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatWeekRange(days: string[]): string {
  const start = new Date(`${days[0]}T12:00:00`)
  const end = new Date(`${days[6]}T12:00:00`)
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: es })} – ${format(end, 'd MMMM yyyy', { locale: es })}`
  }
  return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`
}
