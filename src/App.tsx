import { lazy, Suspense, useEffect } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  ChartColumnBig,
  ListChecks,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type AppView } from '@/stores/appStore'
import { DashboardView } from '@/features/dashboard/dashboard-view'
import { CalendarView } from '@/features/calendar/calendar-view'
import { HabitsView } from '@/features/habits/habits-view'
import { useTheme } from '@/hooks/use-theme'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

const StatsView = lazy(() =>
  import('@/features/stats/stats-view').then((m) => ({ default: m.StatsView })),
)

const NAV_ITEMS: { id: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'stats', label: 'Estadísticas', icon: ChartColumnBig },
  { id: 'habits', label: 'Hábitos', icon: ListChecks },
]

export default function App() {
  const status = useAppStore((s) => s.status)
  const error = useAppStore((s) => s.error)
  const initialize = useAppStore((s) => s.initialize)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh flex-col md:flex-row">
        {/* Sidebar escritorio */}
        <aside className="hidden border-r bg-card md:flex md:w-56 md:flex-col md:gap-2 md:p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="size-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Hábitos</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-current={view === id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                  view === id && 'bg-accent text-accent-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-full justify-start gap-3 px-3 text-muted-foreground"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </Button>
          </div>
        </aside>

        {/* Nav móvil */}
        <nav className="sticky top-0 z-10 flex items-center justify-around border-b bg-card py-2 md:hidden">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-label={label}
              aria-current={view === id ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-md px-4 py-1 text-[11px] text-muted-foreground',
                view === id && 'text-foreground',
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex flex-col items-center gap-0.5 rounded-md px-4 py-1 text-[11px] text-muted-foreground"
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            Tema
          </button>
        </nav>

        <main className="mx-auto w-full max-w-full flex-1 px-2 pb-24 pt-4 sm:px-3 md:px-4 lg:px-6">
          {status === 'loading' && (
            <p className="mt-20 text-center text-muted-foreground">Cargando…</p>
          )}
          {status === 'error' && (
            <p className="mt-20 text-center text-destructive">Error: {error}</p>
          )}
          {status === 'ready' && (
            <>
              {view === 'dashboard' && <DashboardView />}
              {view === 'calendar' && <CalendarView />}
              {view === 'stats' && (
                <Suspense
                  fallback={<p className="mt-20 text-center text-muted-foreground">Cargando…</p>}
                >
                  <StatsView />
                </Suspense>
              )}
              {view === 'habits' && <HabitsView />}
            </>
          )}
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  )
}
