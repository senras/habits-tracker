export type HabitType = 'fixed' | 'extra'

export type MeasurementType = 'boolean' | 'percentage' | 'time' | 'counter'

export type LogStatus = 'incomplete' | 'completed' | 'overcompleted'

export interface Habit {
  id: string
  name: string
  type: HabitType
  category: string
  measurementType: MeasurementType
  targetValue: number
  scheduleDays?: number[]
  startDate: string
  endDate: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  date: string
  status: LogStatus
  value: number
  pointsEarned: number
  updatedAt: string
}

export const POINTS_COMPLETE = 10
export const POINTS_OVERCOMPLETE_BONUS = 10
