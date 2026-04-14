import type { OperatorId } from "../data/siteContent"

export const TIME_SLOTS = [
  { id: "s1", label: "7:00 – 8:30 am" },
  { id: "s2", label: "8:30 – 10:00 am" },
  { id: "s3", label: "10:00 – 11:30 am" },
  { id: "s4", label: "12:30 – 2:00 pm" },
  { id: "s5", label: "2:00 – 3:30 pm" },
  { id: "s6", label: "3:30 – 5:00 pm" },
] as const

export type SlotId = (typeof TIME_SLOTS)[number]["id"]

/** All days of the week are bookable, including Sunday. */
export function isBookableDay(): boolean {
  return true
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** Next N calendar days that are bookable, starting from `from` (inclusive). */
export function getBookableDates(from: Date, count: number): Date[] {
  const out: Date[] = []
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (out.length < count) {
    if (isBookableDay()) out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export function slotKey(operatorId: OperatorId, dateKey: string, slotId: SlotId): string {
  return `${operatorId}|${dateKey}|${slotId}`
}
