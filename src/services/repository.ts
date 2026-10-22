import { createStore, get, set } from 'idb-keyval'
import type { Habit, HabitLog } from '@/types/domain'

export interface Snapshot {
  habits: Habit[]
  logs: HabitLog[]
}

export interface DataRepository {
  isEmpty(): Promise<boolean>
  load(): Promise<Snapshot>
  saveHabit(habit: Habit): Promise<void>
  deleteHabit(id: string): Promise<void>
  saveLog(log: HabitLog): Promise<void>
  saveLogs(logs: HabitLog[]): Promise<void>
  deleteLog(habitId: string, date: string): Promise<void>
  hasFlag(key: string): Promise<boolean>
  setFlag(key: string): Promise<void>
}

const store = createStore('habits-tracker-db', 'kv')
const HABITS_KEY = 'habits'
const LOGS_KEY = 'logs'

export const localRepository: DataRepository = {
  async isEmpty() {
    const habits = await get<Habit[]>(HABITS_KEY, store)
    return !habits || habits.length === 0
  },

  async hasFlag(key: string) {
    const v = await get<string>(`flag:${key}`, store)
    return v === '1'
  },

  async setFlag(key: string) {
    await set(`flag:${key}`, '1', store)
  },

  async load(): Promise<Snapshot> {
    const [habits, logs] = await Promise.all([
      get<Habit[]>(HABITS_KEY, store),
      get<HabitLog[]>(LOGS_KEY, store),
    ])
    return { habits: habits ?? [], logs: logs ?? [] }
  },

  async saveHabit(habit: Habit) {
    const habits = (await get<Habit[]>(HABITS_KEY, store)) ?? []
    const idx = habits.findIndex((h) => h.id === habit.id)
    if (idx >= 0) habits[idx] = habit
    else habits.push(habit)
    await set(HABITS_KEY, habits, store)
  },

  async deleteHabit(id: string) {
    const habits = (await get<Habit[]>(HABITS_KEY, store)) ?? []
    await set(
      HABITS_KEY,
      habits.filter((h) => h.id !== id),
      store,
    )
    const logs = (await get<HabitLog[]>(LOGS_KEY, store)) ?? []
    await set(
      LOGS_KEY,
      logs.filter((l) => l.habitId !== id),
      store,
    )
  },

  async saveLog(log: HabitLog) {
    const logs = (await get<HabitLog[]>(LOGS_KEY, store)) ?? []
    const idx = logs.findIndex((l) => l.habitId === log.habitId && l.date === log.date)
    if (idx >= 0) logs[idx] = log
    else logs.push(log)
    await set(LOGS_KEY, logs, store)
  },

  async saveLogs(newLogs: HabitLog[]) {
    if (newLogs.length === 0) return
    const logs = (await get<HabitLog[]>(LOGS_KEY, store)) ?? []
    await set(LOGS_KEY, [...logs, ...newLogs], store)
  },

  async deleteLog(habitId: string, date: string) {
    const logs = (await get<HabitLog[]>(LOGS_KEY, store)) ?? []
    const filtered = logs.filter((l) => !(l.habitId === habitId && l.date === date))
    if (filtered.length === logs.length) return
    await set(LOGS_KEY, filtered, store)
  },
}
