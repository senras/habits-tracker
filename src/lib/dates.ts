import { format, parseISO } from 'date-fns'

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODate(iso: string): Date {
  return parseISO(iso)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function weekdayOf(iso: string): number {
  return fromISODate(iso).getDay()
}

export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromISODate(value).getTime())
}

export function isBeforeDay(a: string, b: string): boolean {
  return a < b
}

export function isAfterDay(a: string, b: string): boolean {
  return a > b
}
