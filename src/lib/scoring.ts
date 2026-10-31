import {
  POINTS_COMPLETE,
  POINTS_OVERCOMPLETE_BONUS,
  type Habit,
  type HabitLog,
  type LogStatus,
  type Weekday,
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
    case 'skipped':
    case 'rest':
      return 0
  }
}

function isWeekdayInSchedule(habit: Habit, wd: Weekday): boolean {
  // v2 schedule
  if (habit.schedule) {
    if (habit.schedule.mode === 'daily') return true
    if (habit.schedule.mode === 'weekdays') {
      return habit.schedule.days.includes(wd)
    }
    // timesPerWeek/timesPerMonth don't count towards daily base goal by calendar days
    if (habit.schedule.mode === 'timesPerWeek' || habit.schedule.mode === 'timesPerMonth') {
      return false
    }
    return true
  }
  // v1 compatibility
  if (habit.scheduleDays !== undefined) {
    return habit.scheduleDays.includes(wd)
  }
  return true
}

export function isHabitScheduled(habit: Habit, date: string): boolean {
  if (date < habit.startDate) return false
  if (habit.endDate !== null && date > habit.endDate) return false
  if (habit.archived) {
    if (habit.archivedAt === null || date > habit.archivedAt) return false
  }
  const wd = weekdayOf(date) as Weekday
  if (habit.restDays && habit.restDays.includes(wd)) return false
  if (!isWeekdayInSchedule(habit, wd)) return false
  return true
}

export interface DayScore {
  earned: number
  goal: number
}

export function getBaseGoalPoints(habits: Habit[], date: string, logs: HabitLog[] = []): number {
  const fixedScheduled = habits.filter(
    (h) => h.type === 'fixed' && isHabitScheduled(h, date),
  )
  const sum = fixedScheduled.reduce((acc, h) => {
    // If there's a rest/skipped log for this habit on this date, exclude from base
    const log = logs.find((l) => l.habitId === h.id && l.date === date)
    if (log && (log.status === 'rest' || log.status === 'skipped')) {
      return acc
    }
    return acc + POINTS_COMPLETE
  }, 0)
  return sum
}

export function getDayScore(
  habits: Habit[],
  logs: HabitLog[],
  date: string,
): DayScore {
  const earned = logs
    .filter((log) => log.date === date)
    .reduce((sum, log) => sum + log.pointsEarned, 0)
  return { earned, goal: getBaseGoalPoints(habits, date, logs) }
}

export function dayPerformance(score: DayScore): number | null {
  if (score.goal === 0) return null
  return score.earned / score.goal
}

export function isDayNeutral(score: DayScore): boolean {
  return score.goal === 0
}

export function isDayPerfect(score: DayScore): boolean {
  if (score.goal === 0) return false
  return score.earned >= score.goal
}
