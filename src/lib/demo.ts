import { v4 as uuid } from 'uuid'
import { computePoints, resolveStatus } from './scoring'
import { format, subDays } from 'date-fns'
import type { Habit, HabitLog } from '@/types/domain'

const DEMO_HABITS: Omit<Habit, 'id' | 'createdAt'>[] = [
  {
    name: 'Estudiar inglés',
    type: 'fixed',
    category: 'Estudio',
    measurementType: 'time',
    targetValue: 30,
    scheduleDays: [1, 2, 3, 4, 5],
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
  {
    name: 'Ejercicio',
    type: 'fixed',
    category: 'Salud',
    measurementType: 'time',
    targetValue: 45,
    scheduleDays: [1, 3, 5],
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
  {
    name: 'Beber 8 vasos de agua',
    type: 'fixed',
    category: 'Salud',
    measurementType: 'counter',
    targetValue: 8,
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
  {
    name: 'Ordenar la casa',
    type: 'fixed',
    category: 'Hogar',
    measurementType: 'boolean',
    targetValue: 1,
    scheduleDays: [6, 0],
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
  {
    name: 'Leer un capítulo',
    type: 'extra',
    category: 'Estudio',
    measurementType: 'counter',
    targetValue: 1,
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
  {
    name: 'Meditar',
    type: 'extra',
    category: 'Salud',
    measurementType: 'time',
    targetValue: 10,
    startDate: subDays(new Date(), 70).toISOString().slice(0, 10),
    endDate: null,
    archived: false,
    archivedAt: null,
  },
]

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildDemoData(today = new Date()): { habits: Habit[]; logs: HabitLog[] } {
  const rand = mulberry32(20260822)
  const habits: Habit[] = DEMO_HABITS.map((h) => ({
    ...h,
    id: uuid(),
    createdAt: new Date().toISOString(),
  }))
  const logs: HabitLog[] = []
  const todayStr = format(today, 'yyyy-MM-dd')

  for (let offset = 69; offset >= 0; offset--) {
    const date = format(subDays(today, offset), 'yyyy-MM-dd')
    const weekday = subDays(today, offset).getDay()
    // semana en mejora progresiva: probabilidad de éxito crece con el tiempo
    const progress = (69 - offset) / 69

    for (const habit of habits) {
      if (habit.scheduleDays && !habit.scheduleDays.includes(weekday)) continue
      if (date > todayStr) continue

      const baseRate = habit.type === 'fixed' ? 0.55 + 0.35 * progress : 0.35 + 0.3 * progress
      const roll = rand()

      let value = 0
      if (roll < baseRate) value = habit.targetValue
      else if (roll < baseRate * 1.25) value = Math.round(habit.targetValue * (0.3 + rand() * 0.5))

      if (habit.type === 'extra' && value > 0 && rand() < 0.12) {
        value = habit.targetValue * 2
      }
      if (value <= 0) continue

      const manualOvercomplete =
        habit.measurementType === 'boolean' && habit.type === 'extra' && rand() < 0.05
      const status = resolveStatus(habit, value, manualOvercomplete)

      logs.push({
        id: uuid(),
        habitId: habit.id,
        date,
        status,
        value,
        pointsEarned: computePoints(status),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return { habits, logs }
}
