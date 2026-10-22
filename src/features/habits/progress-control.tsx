import { Check, Minus, Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Habit, HabitLog } from '@/types/domain'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProgressControlProps {
  habit: Habit
  date: string
  log?: HabitLog
  disabled?: boolean
}

const STEP_MINUTES = 5

export function statusColorClass(status: HabitLog['status'] | undefined): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'overcompleted':
      return 'text-violet-600 dark:text-violet-400'
    default:
      return 'text-muted-foreground'
  }
}

export function ProgressControl({ habit, date, log, disabled }: ProgressControlProps) {
  const setProgress = useAppStore((s) => s.setProgress)
  const value = log?.value ?? 0

  const update = (v: number) => void setProgress(habit.id, date, v)

  if (habit.measurementType === 'boolean') {
    const done = (log?.status ?? 'incomplete') !== 'incomplete'
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={done ? 'default' : 'outline'}
              size="icon"
              className="size-7"
              disabled={disabled}
              aria-label={done ? `Desmarcar ${habit.name}` : `Completar ${habit.name}`}
              aria-pressed={done}
              onClick={() => update(done ? 0 : habit.targetValue)}
            >
              <Check className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{done ? 'Quitar marca' : 'Completar (+10 pts)'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={disabled || !log}
              aria-label={`Marcar sobre-cumplido ${habit.name}`}
              aria-pressed={log?.status === 'overcompleted'}
              onClick={() => void setProgress(habit.id, date, 0, true)}
            >
              <Star
                className={cn(
                  'size-4',
                  log?.status === 'overcompleted' && 'fill-violet-500 text-violet-500',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sobre-cumplido (+20 pts)</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  if (habit.measurementType === 'percentage') {
    return (
      <div className="flex w-full min-w-36 items-center gap-2">
        <Slider
          min={0}
          max={100}
          step={5}
          value={[value]}
          disabled={disabled}
          aria-label={`Progreso de ${habit.name}`}
          onValueChange={([v]) => update(v)}
        />
        <span className="w-12 text-right font-mono text-xs tabular-nums">
          {value}%
        </span>
      </div>
    )
  }

  const unit = habit.measurementType === 'time' ? 'min' : ''
  const step = habit.measurementType === 'time' ? STEP_MINUTES : 1

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        disabled={disabled || value <= 0}
        aria-label={`Reducir ${habit.name}`}
        onClick={() => update(Math.max(0, value - step))}
      >
        <Minus className="size-4" />
      </Button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => update(0)}
        title="Reiniciar"
        className={cn(
          'w-20 rounded px-1 py-0.5 text-center font-mono text-xs tabular-nums hover:bg-accent',
          statusColorClass(log?.status),
        )}
      >
        {value}/{habit.targetValue} {unit}
      </button>
      <Button
        variant="outline"
        size="icon"
        className="size-7"
        disabled={disabled}
        aria-label={`Aumentar ${habit.name}`}
        onClick={() => update(value + step)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}
