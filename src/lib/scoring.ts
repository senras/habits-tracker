import {
  POINTS_COMPLETE,
  POINTS_OVERCOMPLETE_BONUS,
  type Habit,
  type HabitLog,
  type LogStatus,
} from '@/types/domain'
import { weekdayOf } from './dates'

export function resolveStatus(habit: Habit, value: number, manualOvercomplete = false): LogStatus {
  if (value <= 0) return 'incomplete'

  switch (habit.measurementType) {
    case 'boolean':
      return manualOvercomplete ? 'overcompleted' : 'completed'
    case 'percentage':
      return value >= habit.targetValue ? 'completed' : 'incomplete'
    case 'time':
    case 'counter':
      if (value < habit.targetValue) return 'incomplete'
      return value > habit.targetValue ? 'overcompleted' : 'completed'
  }
}

export function computePoints(status: LogStatus): number {
  switch (status) {
    case 'incomplete':
      return 0
    case 'completed':
      return POINTS_COMPLETE
    case 'overcompleted':
      return POINTS_COMPLETE + POINTS_OVERCOMPLETE_BONUS
  }
}

export function isHabitScheduled(habit: Habit, date: string): boolean {
  if (date < habit.startDate) return false
  if (habit.endDate !== null && date > habit.endDate) return false
  if (habit.archived) {
    if (habit.archivedAt === null || date > habit.archivedAt) return false
  }
  if (habit.scheduleDays !== undefined && !habit.scheduleDays.includes(weekdayOf(date))) {
    return false
  }
  return true
}

export interface DayScore {
  earned: number
  goal: number
}

export function getBaseGoalPoints(habits: Habit[], date: string): number {
  const fixedCount = habits.filter(
    (h) => h.type === 'fixed' && isHabitScheduled(h, date),
  ).length
  return fixedCount * POINTS_COMPLETE
}

export function getDayScore(
  habits: Habit[],
  logs: HabitLog[],
  date: string,
): DayScore {
  const earned = logs
    .filter((log) => log.date === date)
    .reduce((sum, log) => sum + log.pointsEarned, 0)
  return { earned, goal: getBaseGoalPoints(habits, date) }
}

export function dayPerformance(score: DayScore): number | null {
  if (score.goal === 0) return null
  return score.earned / score.goal
}
