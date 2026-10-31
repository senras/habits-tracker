export type HabitType = 'fixed' | 'extra'
export type MeasurementType = 'boolean' | 'percentage' | 'time' | 'counter'
export type LogStatus = 'incomplete' | 'completed' | 'overcompleted' | 'skipped' | 'rest'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo

export type HabitSchedule =
  | { mode: 'daily' }
  | { mode: 'weekdays'; days: Weekday[] }
  | { mode: 'timesPerWeek'; times: number }
  | { mode: 'timesPerMonth'; times: number }

export interface Habit {
  id: string // UUID v4
  name: string
  type: HabitType
  category: string // texto libre, autocompletable
  measurementType: MeasurementType
  targetValue: number
  schedule: HabitSchedule // programación flexible (v2)
  scheduleDays?: number[] // @deprecated - compat v1.x, migrado a schedule
  restDays?: Weekday[] // días de descanso programado
  startDate: string // YYYY-MM-DD local
  endDate: string | null // null = indefinido
  archived: boolean
  archivedAt: string | null // fecha de archivo (YYYY-MM-DD); null si activo
  createdAt: string
}

export interface HabitLog {
  id: string // UUID v4
  habitId: string
  date: string // YYYY-MM-DD local
  status: LogStatus
  value: number // valor registrado según measurementType
  pointsEarned: number // denormalizado: 0 | 10 | 20
  note?: string | null // Log Note (≤ 280 caracteres)
  updatedAt: string // ISO datetime
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'postponed'
export type TaskDateMode = 'strict' | 'floating'
export type RolloverMode = 'auto' | 'manual' | 'off'

export interface Subtask {
  id: string
  title: string
  done: boolean
  completedAt: string | null
}

export interface Task {
  id: string // UUID v4
  title: string
  description?: string | null
  status: TaskStatus
  tags: string[] // etiquetas normalizadas
  dateMode: TaskDateMode // 'strict' = deadline; 'floating' = ventana
  dueDate?: string | null // deadline
  windowStart?: string | null // ventana
  windowEnd?: string | null // ventana
  plannedDate?: string | null // día en que aparece en «Hoy»
  rollover: RolloverMode
  rolloverCount: number // nº de veces movida
  postponedTo?: string | null
  subtasks: Subtask[]
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export const POINTS_COMPLETE = 10
export const POINTS_OVERCOMPLETE_BONUS = 10
