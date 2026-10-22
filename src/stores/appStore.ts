import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { Habit, HabitLog } from '@/types/domain'
import { computePoints, resolveStatus } from '@/lib/scoring'
import { localRepository } from '@/services/repository'
import { buildDemoData } from '@/lib/demo'

export type AppView = 'dashboard' | 'calendar' | 'stats' | 'habits'
export type CalendarMode = 'week' | 'month'

interface AppState {
  habits: Habit[]
  logs: HabitLog[]
  status: 'loading' | 'ready' | 'error'
  error: string | null
  view: AppView
  calendarMode: CalendarMode
  anchorDate: string
  setView: (view: AppView) => void
  setCalendarMode: (mode: CalendarMode) => void
  setAnchorDate: (date: string) => void
  initialize: () => Promise<void>
  upsertHabit: (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => Promise<void>
  archiveHabit: (id: string, archived: boolean) => Promise<void>
  removeHabit: (id: string) => Promise<void>
  setProgress: (habitId: string, date: string, value: number, manualOvercomplete?: boolean) => Promise<void>
  toggleComplete: (habitId: string, date: string) => Promise<void>
  clearLog: (habitId: string, date: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  habits: [],
  logs: [],
  status: 'loading',
  error: null,
  view: 'dashboard',
  calendarMode: 'week',
  anchorDate: new Date().toISOString().slice(0, 10),

  setView: (view) => set({ view }),
  setCalendarMode: (calendarMode) => set({ calendarMode }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),

  async initialize() {
    try {
      const seeded = await localRepository.hasFlag('demo-seeded')
      let { habits, logs } = await localRepository.load()
      if (habits.length === 0 && logs.length === 0 && !seeded) {
        const demo = buildDemoData()
        habits = demo.habits
        logs = demo.logs
        await localRepository.saveLogs(demo.logs)
        for (const habit of demo.habits) await localRepository.saveHabit(habit)
        await localRepository.setFlag('demo-seeded')
      }
      set({ habits, logs, status: 'ready' })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  async upsertHabit(input) {
    const now = new Date().toISOString()
    const existing = input.id ? get().habits.find((h) => h.id === input.id) : undefined
    const habit: Habit = {
      id: existing?.id ?? input.id ?? uuid(),
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      name: input.name,
      type: input.type,
      category: input.category,
      measurementType: input.measurementType,
      targetValue: input.targetValue,
      scheduleDays: input.scheduleDays,
      startDate: input.startDate,
      endDate: input.endDate,
      archived: input.archived,
      archivedAt: input.archivedAt ?? null,
    }
    await localRepository.saveHabit(habit)
    set((s) => ({
      habits: s.habits.some((h) => h.id === habit.id)
        ? s.habits.map((h) => (h.id === habit.id ? habit : h))
        : [...s.habits, habit],
    }))
  },

  async archiveHabit(id, archived) {
    const habit = get().habits.find((h) => h.id === id)
    if (!habit || habit.archived === archived) return
    const updated: Habit = {
      ...habit,
      archived,
      archivedAt: archived ? new Date().toISOString().slice(0, 10) : null,
    }
    await localRepository.saveHabit(updated)
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? updated : h)) }))
  },

  async removeHabit(id) {
    await localRepository.deleteHabit(id)
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      logs: s.logs.filter((l) => l.habitId !== id),
    }))
  },

  async setProgress(habitId, date, value, manualOvercomplete = false) {
    const habit = get().habits.find((h) => h.id === habitId)
    if (!habit) return

    if (value <= 0 && !manualOvercomplete) {
      const exists = get().logs.some((l) => l.habitId === habitId && l.date === date)
      if (!exists) return
      await localRepository.deleteLog(habitId, date)
      set((s) => ({ logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === date)) }))
      return
    }

    const prev = get().logs.find((l) => l.habitId === habitId && l.date === date)
    const effectiveValue = value <= 0 ? (prev?.value ?? habit.targetValue) : value
    const wasOver = prev?.status === 'overcompleted'
    const status = resolveStatus(habit, effectiveValue, manualOvercomplete && !wasOver)
    const log: HabitLog = {
      id: prev?.id ?? uuid(),
      habitId,
      date,
      status,
      value: effectiveValue,
      pointsEarned: computePoints(status),
      updatedAt: new Date().toISOString(),
    }
    await localRepository.saveLog(log)
    set((s) => ({
      logs: s.logs.some((l) => l.habitId === habitId && l.date === date)
        ? s.logs.map((l) => (l.habitId === habitId && l.date === date ? log : l))
        : [...s.logs, log],
    }))
  },

  async toggleComplete(habitId, date) {
    const prev = get().logs.find((l) => l.habitId === habitId && l.date === date)
    if (prev && (prev.status === 'completed' || prev.status === 'overcompleted')) {
      await get().clearLog(habitId, date)
      return
    }
    const habit = get().habits.find((h) => h.id === habitId)
    if (!habit) return
    await get().setProgress(habitId, date, habit.targetValue)
  },

  async clearLog(habitId, date) {
    const exists = get().logs.some((l) => l.habitId === habitId && l.date === date)
    if (!exists) return
    await localRepository.deleteLog(habitId, date)
    set((s) => ({ logs: s.logs.filter((l) => !(l.habitId === habitId && l.date === date)) }))
  },
}))

export function selectHabitById(habits: Habit[], id: string) {
  return habits.find((h) => h.id === id)
}
