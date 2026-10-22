import { describe, expect, it } from 'vitest'
import { computePoints } from './scoring'
import type { Habit, HabitLog } from '@/types/domain'
import {
  computeRates,
  computeStreaks,
  heatmapData,
  improvementDelta,
  previousRange,
  type DateRange,
} from './stats'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    type: 'fixed',
    category: 'Salud',
    measurementType: 'boolean',
    targetValue: 1,
    scheduleDays: undefined,
    startDate: '2026-07-01',
    endDate: null,
    archived: false,
    archivedAt: null,
    createdAt: '',
    ...overrides,
  }
}

function log(habitId: string, date: string, status: HabitLog['status']): HabitLog {
  return {
    id: `${habitId}-${date}`,
    habitId,
    date,
    status,
    value: 1,
    pointsEarned: computePoints(status),
    updatedAt: '',
  }
}

describe('computeRates', () => {
  it('cuenta días sin log como incompletos', () => {
    const habits = [habit({ id: 'a' }), habit({ id: 'b', type: 'extra' })]
    const logs = [
      log('a', '2026-08-20', 'completed'),
      log('b', '2026-08-20', 'overcompleted'),
    ]
    const range: DateRange = { start: '2026-08-20', end: '2026-08-21' }
    const rates = computeRates(habits, logs, range)
    // 2 hábitos × 2 días = 4 programados; 1 completed + 1 overcompleted + 2 incomplete
    expect(rates.scheduledCount).toBe(4)
    expect(rates.completedCount).toBe(1)
    expect(rates.overcompletedCount).toBe(1)
    expect(rates.completionRate).toBeCloseTo(0.25)
    expect(rates.overcompletionRate).toBeCloseTo(0.25)
  })
})

describe('computeStreaks', () => {
  it('racha actual y más larga con días perfectos consecutivos', () => {
    const h = habit({ id: 'f' })
    const habits = [h]
    const logs: HabitLog[] = []
    // hoy=2026-08-22 (sábado): perfectos 19,20,21 y 22; hueco el 18; perfectos 14–17
    for (const d of ['2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17']) {
      logs.push(log('f', d, 'completed'))
    }
    logs.push(log('f', '2026-08-19', 'completed'))
    logs.push(log('f', '2026-08-20', 'completed'))
    logs.push(log('f', '2026-08-21', 'overcompleted'))
    logs.push(log('f', '2026-08-22', 'completed'))
    const streaks = computeStreaks(habits, logs, new Date('2026-08-22T12:00:00'))
    expect(streaks.longest).toBe(4)
    expect(streaks.current).toBe(4)
  })

  it('día sin fijos no rompe la racha (se omite de la secuencia)', () => {
    const h = habit({ id: 'f', scheduleDays: [5] }) // solo viernes
    const logs = [log('f', '2026-08-14', 'completed'), log('f', '2026-08-21', 'completed')]
    const streaks = computeStreaks([h], logs, new Date('2026-08-22T12:00:00'))
    expect(streaks.current).toBe(2)
    expect(streaks.longest).toBe(2)
  })
})

describe('heatmapData niveles', () => {
  it('asigna nivel 4 al 100%+ y 0 sin datos', () => {
    const h = habit({ id: 'f' })
    const logs = [log('f', '2026-08-21', 'overcompleted')]
    const cells = heatmapData(
      [h],
      logs,
      { start: '2026-08-20', end: '2026-08-22' },
    )
    expect(cells.find((c) => c.date === '2026-08-21')?.level).toBe(4)
    expect(cells.find((c) => c.date === '2026-08-20')?.level).toBe(0)
    expect(cells.find((c) => c.date === '2026-08-22')?.level).toBe(0) // futuro sin log
  })
})

describe('improvementDelta / previousRange', () => {
  it('delta positivo cuando mejora la semana', () => {
    const prev: DateRange = previousRange({ start: '2026-08-17', end: '2026-08-23' })
    expect(prev).toEqual({ start: '2026-08-10', end: '2026-08-16' })
  })

  it('deltaPct null cuando el período anterior promedia 0', () => {
    const h = habit()
    const result = improvementDelta(
      [h],
      [],
      { start: '2026-08-17', end: '2026-08-23' },
    )
    expect(result.previousValue).toBe(0)
    expect(result.deltaPct).toBeNull()
  })
})
