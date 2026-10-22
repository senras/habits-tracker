import { describe, expect, it } from 'vitest'
import type { Habit } from '@/types/domain'
import {
  computePoints,
  dayPerformance,
  getBaseGoalPoints,
  getDayScore,
  isHabitScheduled,
  resolveStatus,
} from './scoring'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    type: 'fixed',
    category: 'Salud',
    measurementType: 'boolean',
    targetValue: 1,
    scheduleDays: undefined,
    startDate: '2026-01-01',
    endDate: null,
    archived: false,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('resolveStatus', () => {
  it('boolean: 0 es incomplete, 1 es completed', () => {
    const h = habit()
    expect(resolveStatus(h, 0)).toBe('incomplete')
    expect(resolveStatus(h, 1)).toBe('completed')
  })

  it('boolean: overcomplete solo manual', () => {
    const h = habit()
    expect(resolveStatus(h, 1, true)).toBe('overcompleted')
  })

  it('percentage: exige target (100) para completar', () => {
    const h = habit({ measurementType: 'percentage', targetValue: 100 })
    expect(resolveStatus(h, 50)).toBe('incomplete')
    expect(resolveStatus(h, 99)).toBe('incomplete')
    expect(resolveStatus(h, 100)).toBe('completed')
  })

  it('time: completo al llegar a la meta, sobrecompleto al superarla', () => {
    const h = habit({ measurementType: 'time', targetValue: 30 })
    expect(resolveStatus(h, 15)).toBe('incomplete')
    expect(resolveStatus(h, 30)).toBe('completed')
    expect(resolveStatus(h, 45)).toBe('overcompleted')
  })

  it('counter: igual que time', () => {
    const h = habit({ measurementType: 'counter', targetValue: 5 })
    expect(resolveStatus(h, 4)).toBe('incomplete')
    expect(resolveStatus(h, 5)).toBe('completed')
    expect(resolveStatus(h, 6)).toBe('overcompleted')
  })
})

describe('computePoints', () => {
  it('0 / 10 / 20 según estado', () => {
    expect(computePoints('incomplete')).toBe(0)
    expect(computePoints('completed')).toBe(10)
    expect(computePoints('overcompleted')).toBe(20)
  })
})

describe('isHabitScheduled', () => {
  it('activo sin agenda: todos los días dentro del rango', () => {
    const h = habit({ startDate: '2026-08-10' })
    expect(isHabitScheduled(h, '2026-08-22')).toBe(true)
    expect(isHabitScheduled(h, '2026-08-09')).toBe(false)
    expect(isHabitScheduled(h, '2027-01-01')).toBe(true)
  })

  it('respeta endDate', () => {
    const h = habit({ startDate: '2026-08-01', endDate: '2026-08-20' })
    expect(isHabitScheduled(h, '2026-08-20')).toBe(true)
    expect(isHabitScheduled(h, '2026-08-21')).toBe(false)
  })

  it('respeta scheduleDays (0=domingo)', () => {
    // 2026-08-19 es miércoles (3), 2026-08-23 es domingo (0)
    const h = habit({ scheduleDays: [1, 3, 5] })
    expect(isHabitScheduled(h, '2026-08-19')).toBe(true)
    expect(isHabitScheduled(h, '2026-08-23')).toBe(false)
  })

  it('archivado: programado solo hasta archivedAt', () => {
    const h = habit({ archived: true, archivedAt: '2026-08-15' })
    expect(isHabitScheduled(h, '2026-08-15')).toBe(true)
    expect(isHabitScheduled(h, '2026-08-16')).toBe(false)
    expect(isHabitScheduled(h, '2026-08-14')).toBe(true)
  })
})

describe('getBaseGoalPoints', () => {
  it('cuenta solo fijos programados × 10', () => {
    const habits = [
      habit({ id: 'a' }),
      habit({ id: 'b', type: 'extra' }),
      habit({ id: 'c', scheduleDays: [1] }), // lunes; 2026-08-22 es sábado
      habit({ id: 'd' }),
    ]
    expect(getBaseGoalPoints(habits, '2026-08-22')).toBe(20)
  })
})

describe('getDayScore + dayPerformance — caso del prompt: 70/50 pts', () => {
  it('5 fijos completados + 2 extras completados = 70/50 (140%)', () => {
    const fixed = Array.from({ length: 5 }, (_, i) =>
      habit({ id: `f${i}`, type: 'fixed' }),
    )
    const extras = Array.from({ length: 2 }, (_, i) =>
      habit({ id: `e${i}`, type: 'extra' }),
    )
    const date = '2026-08-22'
    const log = (habitId: string, status: 'completed') => ({
      id: habitId,
      habitId,
      date,
      status,
      value: 1,
      pointsEarned: computePoints(status),
      updatedAt: '',
    })
    const logs = [
      ...fixed.map((h) => log(h.id, 'completed')),
      ...extras.map((h) => log(h.id, 'completed')),
    ]
    const score = getDayScore([...fixed, ...extras], logs, date)
    expect(score).toEqual({ earned: 70, goal: 50 })
    expect(dayPerformance(score)).toBeCloseTo(1.4)
  })

  it('meta base 0 ⇒ rendimiento n/a', () => {
    expect(dayPerformance({ earned: 30, goal: 0 })).toBeNull()
  })
})
