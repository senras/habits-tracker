import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { Habit, MeasurementType } from '@/types/domain'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  boolean: 'Sí/No',
  percentage: 'Porcentaje',
  time: 'Tiempo (min)',
  counter: 'Contador',
}

export interface FormState {
  id?: string
  name: string
  type: 'fixed' | 'extra'
  category: string
  measurementType: MeasurementType
  targetValue: number
  scheduleDays: number[] | undefined
  startDate: string
  endDate: string
}

const DEFAULT_TARGET: Record<MeasurementType, number> = {
  boolean: 1,
  percentage: 100,
  time: 30,
  counter: 5,
}

export function emptyForm(): FormState {
  return {
    name: '',
    type: 'fixed',
    category: '',
    measurementType: 'boolean',
    targetValue: 1,
    scheduleDays: undefined,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  }
}

export function toForm(habit: Habit): FormState {
  return {
    id: habit.id,
    name: habit.name,
    type: habit.type,
    category: habit.category,
    measurementType: habit.measurementType,
    targetValue: habit.targetValue,
    scheduleDays: habit.scheduleDays ? [...habit.scheduleDays] : undefined,
    startDate: habit.startDate,
    endDate: habit.endDate ?? '',
  }
}

export function HabitFormDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean
  initial: FormState
  onClose: () => void
}) {
  const upsertHabit = useAppStore((s) => s.upsertHabit)
  const habits = useAppStore((s) => s.habits)
  const [form, setForm] = useState<FormState>(initial)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  const categories = useMemo(
    () => [...new Set(habits.map((h) => h.category).filter(Boolean))],
    [habits],
  )

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function toggleScheduleDay(day: number) {
    const current = form.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6]
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort()
    patch({ scheduleDays: next.length === 7 || next.length === 0 ? undefined : next })
  }

  function setMeasurement(mt: MeasurementType) {
    patch({ measurementType: mt, targetValue: DEFAULT_TARGET[mt] })
  }

  async function submit() {
    if (!form.name.trim()) return
    const existing = form.id
      ? useAppStore.getState().habits.find((h) => h.id === form.id)
      : undefined
    await upsertHabit({
      id: form.id,
      name: form.name.trim(),
      type: form.type,
      category: form.category.trim() || 'General',
      measurementType: form.measurementType,
      targetValue: form.targetValue,
      scheduleDays: form.scheduleDays,
      startDate: form.startDate,
      endDate: form.endDate || null,
      archived: existing?.archived ?? false,
      archivedAt: existing?.archivedAt ?? null,
    })
    toast.success(form.id ? 'Hábito actualizado' : 'Hábito creado')
    onClose()
  }

  const needsTarget =
    form.measurementType === 'time' || form.measurementType === 'counter'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Editar hábito' : 'Nuevo hábito'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="habit-name">Nombre</Label>
            <Input
              id="habit-name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Ej. Estudiar inglés"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => patch({ type: v as FormState['type'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fijo</SelectItem>
                  <SelectItem value="extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Categoría</Label>
              <Input
                list="category-suggestions"
                value={form.category}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder="Estudio…"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Medición</Label>
            <Select
              value={form.measurementType}
              onValueChange={(v) => setMeasurement(v as MeasurementType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEASUREMENT_LABELS) as MeasurementType[]).map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {MEASUREMENT_LABELS[mt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsTarget && (
            <div className="grid gap-2">
              <Label htmlFor="habit-target">Meta diaria</Label>
              <Input
                id="habit-target"
                type="number"
                min={1}
                value={form.targetValue}
                onChange={(e) => patch({ targetValue: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Días programados</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const active =
                  form.scheduleDays === undefined || form.scheduleDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleScheduleDay(day)}
                    aria-pressed={active}
                    aria-label={DAY_NAMES[day]}
                    className={cn(
                      'size-8 rounded-md border text-sm font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="habit-start">Inicio</Label>
              <Input
                id="habit-start"
                type="date"
                value={form.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="habit-end">Fin (opcional)</Label>
              <Input
                id="habit-end"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={!form.name.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
