import { useEffect, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Habit } from '@/types/domain'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  DAY_LABELS,
  HabitFormDialog,
  MEASUREMENT_LABELS,
  emptyForm,
  toForm,
  type FormState,
} from './habit-form-dialog'

function scheduleSummary(habit: Habit): string {
  if (!habit.scheduleDays) return 'Todos los días'
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => habit.scheduleDays!.includes(d))
  return days.map((d) => DAY_LABELS[d]).join(' ')
}

export function HabitsView() {
  const habits = useAppStore((s) => s.habits)
  const archiveHabit = useAppStore((s) => s.archiveHabit)
  const removeHabit = useAppStore((s) => s.removeHabit)
  const habitDraft = useAppStore((s) => s.habitDraft)
  const setHabitDraft = useAppStore((s) => s.setHabitDraft)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FormState>(emptyForm())
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (habitDraft) {
      const base = emptyForm()
      setEditing({
        ...base,
        name: habitDraft.name ?? base.name,
        type: habitDraft.type ?? base.type,
        category: habitDraft.category ?? base.category,
        measurementType: habitDraft.measurementType ?? base.measurementType,
        targetValue: habitDraft.targetValue ?? base.targetValue,
        scheduleDays: habitDraft.scheduleDays ?? base.scheduleDays,
        startDate: habitDraft.startDate ?? base.startDate,
        endDate: habitDraft.endDate ?? base.endDate,
      })
      setDialogOpen(true)
      setHabitDraft(null)
    }
  }, [habitDraft, setHabitDraft])

  function openCreate() {
    setEditing(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(habit: Habit) {
    setEditing(toForm(habit))
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    await removeHabit(id)
    setConfirmDeleteId(null)
    toast.success('Hábito eliminado con su histórico')
  }

  const visible = habits.filter((h) => (showArchived ? true : !h.archived))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Hábitos</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Archivados
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          </label>
          <Button onClick={openCreate}>
            <Plus /> Nuevo hábito
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((habit) => (
          <Card key={habit.id} className={cn(habit.archived && 'opacity-60')}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{habit.name}</CardTitle>
                <div className="flex shrink-0 gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Editar ${habit.name}`}
                        onClick={() => openEdit(habit)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={
                          habit.archived
                            ? `Restaurar ${habit.name}`
                            : `Archivar ${habit.name}`
                        }
                        onClick={() => void archiveHabit(habit.id, !habit.archived)}
                      >
                        {habit.archived ? (
                          <ArchiveRestore className="size-4" />
                        ) : (
                          <Archive className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{habit.archived ? 'Restaurar' : 'Archivar'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label={`Eliminar ${habit.name}`}
                        onClick={() =>
                          confirmDeleteId === habit.id
                            ? void handleDelete(habit.id)
                            : setConfirmDeleteId(habit.id)
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {confirmDeleteId === habit.id
                        ? 'Pulsa otra vez para confirmar'
                        : 'Eliminar definitivamente'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              <Badge variant={habit.type === 'fixed' ? 'default' : 'secondary'}>
                {habit.type === 'fixed' ? 'Fijo' : 'Extra'}
              </Badge>
              <Badge variant="outline">{habit.category}</Badge>
              <Badge variant="outline">{MEASUREMENT_LABELS[habit.measurementType]}</Badge>
              {(habit.measurementType === 'time' ||
                habit.measurementType === 'counter') && (
                <Badge variant="outline">Meta: {habit.targetValue}</Badge>
              )}
              <Badge variant="outline">{scheduleSummary(habit)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No hay hábitos todavía. Crea el primero con «Nuevo hábito».
        </p>
      )}

      <HabitFormDialog
        key={editing.id ?? 'new'}
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
