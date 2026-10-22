import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns'
import type { Habit, HabitLog } from '@/types/domain'
import { dayPerformance, getBaseGoalPoints, getDayScore, isHabitScheduled } from './scoring'
import { fromISODate, toISODate } from './dates'

export type RangeKey = 'week' | 'month' | 'year' | 'all'

export interface DateRange {
  start: string
  end: string
}

export function getRange(key: RangeKey, anchor = new Date()): DateRange {
  switch (key) {
    case 'week':
      return {
        start: toISODate(startOfWeek(anchor, { weekStartsOn: 1 })),
        end: toISODate(endOfWeek(anchor, { weekStartsOn: 1 })),
      }
    case 'month':
      return {
        start: toISODate(startOfMonth(anchor)),
        end: toISODate(endOfMonth(anchor)),
      }
    case 'year':
      return { start: toISODate(startOfYear(anchor)), end: toISODate(endOfYear(anchor)) }
    case 'all':
      return { start: '1970-01-01', end: toISODate(anchor) }
  }
}

export function previousRange(range: DateRange): DateRange {
  const days =
    Math.round(
      (fromISODate(range.end).getTime() - fromISODate(range.start).getTime()) /
        86_400_000,
    ) + 1
  return {
    start: toISODate(subDays(fromISODate(range.start), days)),
    end: toISODate(subDays(fromISODate(range.start), 1)),
  }
}

export function getScheduledHabitsForDay(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => isHabitScheduled(h, date))
}

export function logFor(logs: HabitLog[], habitId: string, date: string) {
  return logs.find((l) => l.habitId === habitId && l.date === date)
}

export interface RatesSummary {
  scheduledCount: number
  completedCount: number
  overcompletedCount: number
  incompleteCount: number
  completionRate: number
  overcompletionRate: number
}

export function computeRates(
  habits: Habit[],
  logs: HabitLog[],
  range: DateRange,
): RatesSummary {
  let scheduledCount = 0
  let completedCount = 0
  let overcompletedCount = 0
  let incompleteCount = 0

  for (const date of eachDayInclusive(range.start, range.end)) {
    for (const habit of getScheduledHabitsForDay(habits, date)) {
      scheduledCount++
      const status = logFor(logs, habit.id, date)?.status ?? 'incomplete'
      if (status === 'completed') completedCount++
      else if (status === 'overcompleted') overcompletedCount++
      else incompleteCount++
    }
  }

  const denom = Math.max(1, scheduledCount)
  return {
    scheduledCount,
    completedCount,
    overcompletedCount,
    incompleteCount,
    completionRate: completedCount / denom,
    overcompletionRate: overcompletedCount / denom,
  }
}

function eachDayInclusive(start: string, end: string): string[] {
  if (start === '1970-01-01') {
    // rango histórico: limitar a últimos 3 años para coste acotado
    start = toISODate(subDays(new Date(), 365 * 3))
  }
  return eachDayOfInterval({ start: fromISODate(start), end: fromISODate(end) }).map(
    (d) => format(d, 'yyyy-MM-dd'),
  )
}

export interface Streaks {
  current: number
  longest: number
}

export function computeStreaks(
  habits: Habit[],
  logs: HabitLog[],
  today = new Date(),
): Streaks {
  const todayStr = toISODate(today)
  const firstDate = earliestRelevantDate(habits, logs)
  const days = eachDayInclusive(firstDate, todayStr)

  const isPerfect = (date: string): boolean | null => {
    const goal = getBaseGoalPoints(habits, date)
    if (goal === 0) return null
    const score = getDayScore(habits, logs, date)
    return score.earned >= score.goal
  }

  let longest = 0
  let run = 0
  for (const date of days) {
    const p = isPerfect(date)
    if (p === true) {
      run++
      longest = Math.max(longest, run)
    } else if (p === false) {
      run = 0
    }
  }

  let current = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const p = isPerfect(days[i])
    if (p === true) current++
    else if (p === false) break
  }

  return { current, longest }
}

function earliestRelevantDate(habits: Habit[], logs: HabitLog[]): string {
  const candidates = [
    ...habits.map((h) => h.startDate),
    ...logs.map((l) => l.date),
  ]
  return candidates.length > 0 ? candidates.sort()[0] : toISODate(new Date())
}

export interface CategoryPoint {
  category: string
  points: number
}

export function categoryDistribution(
  logs: HabitLog[],
  habits: Habit[],
  range: DateRange,
): CategoryPoint[] {
  const byId = new Map(habits.map((h) => [h.id, h]))
  const totals = new Map<string, number>()
  for (const log of logs) {
    if (log.date < range.start || log.date > range.end) continue
    const habit = byId.get(log.habitId)
    if (!habit) continue
    totals.set(habit.category, (totals.get(habit.category) ?? 0) + log.pointsEarned)
  }
  return [...totals.entries()]
    .map(([category, points]) => ({ category, points }))
    .sort((a, b) => b.points - a.points)
}

export interface HeatCell {
  date: string
  earned: number
  goal: number
  level: 0 | 1 | 2 | 3 | 4
}

export function heatmapData(
  habits: Habit[],
  logs: HabitLog[],
  range: DateRange,
): HeatCell[] {
  return eachDayInclusive(range.start, range.end).map((date) => {
    const score = getDayScore(habits, logs, date)
    const perf = dayPerformance(score)
    let level: HeatCell['level'] = 0
    if (perf !== null) {
      level = perf >= 1 ? 4 : perf >= 0.75 ? 3 : perf >= 0.25 ? 2 : perf > 0 ? 1 : 0
    } else if (score.earned > 0) {
      level = 4
    }
    return { date, earned: score.earned, goal: score.goal, level }
  })
}

export interface DeltaResult {
  currentValue: number | null
  previousValue: number | null
  deltaPct: number | null
}

export function averagePerformance(
  habits: Habit[],
  logs: HabitLog[],
  range: DateRange,
): number | null {
  const cells = heatmapData(habits, logs, range).filter((c) => c.goal > 0)
  if (cells.length === 0) return null
  const sum = cells.reduce((acc, c) => acc + c.earned / c.goal, 0)
  return sum / cells.length
}

export function improvementDelta(
  habits: Habit[],
  logs: HabitLog[],
  range: DateRange,
): DeltaResult {
  const prev = previousRange(range)
  const currentValue = averagePerformance(habits, logs, range)
  const previousValue = averagePerformance(habits, logs, prev)
  let deltaPct: number | null = null
  if (currentValue !== null && previousValue !== null && previousValue > 0) {
    deltaPct = ((currentValue - previousValue) / previousValue) * 100
  }
  return { currentValue, previousValue, deltaPct }
}

export function addDaysISO(iso: string, n: number): string {
  return toISODate(addDays(new Date(iso), n))
}
