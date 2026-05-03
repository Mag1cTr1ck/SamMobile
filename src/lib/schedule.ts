import type { OperatorId } from "../data/siteContent"

/** Business timezone for booking dates, slot windows, and “past” checks (Cayman local time). */
export const BOOKING_TIMEZONE = "America/Cayman" as const

export const TIME_SLOTS = [
  { id: "s1", label: "7:00 – 8:30 am" },
  { id: "s2", label: "8:30 – 10:00 am" },
  { id: "s3", label: "10:00 – 11:30 am" },
  { id: "s4", label: "12:30 – 2:00 pm" },
  { id: "s5", label: "2:00 – 3:30 pm" },
  { id: "s6", label: "3:30 – 5:00 pm" },
  { id: "s7", label: "5:00 – 6:30 pm" },
  { id: "s8", label: "6:30 – 8:00 pm" },
] as const

export type SlotId = (typeof TIME_SLOTS)[number]["id"]

/**
 * End of each window (minute-of-day). For “today”, a slot stays visible for the whole window
 * (e.g. 3:30–5:00 pm is still shown at 3:35 pm). We only treat it as past after the end time.
 */
const SLOT_END_MINUTES: Record<SlotId, number> = {
  s1: 8 * 60 + 30, // 8:30 am
  s2: 10 * 60, // 10:00 am
  s3: 11 * 60 + 30, // 11:30 am
  s4: 14 * 60, // 2:00 pm
  s5: 15 * 60 + 30, // 3:30 pm
  s6: 17 * 60, // 5:00 pm
  s7: 18 * 60 + 30, // 6:30 pm
  s8: 20 * 60, // 8:00 pm
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** Wall-clock calendar parts in `timeZone` for the given instant. */
export function getZonedCalendarParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  })
  const parts = dtf.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second ?? 0),
  }
}

/** Cayman is UTC−5 year-round; noon local = 17:00 UTC on the same civil date. */
function dateAtNoonInBookingTz(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0, 0))
}

/** All days of the week are bookable, including Sunday. */
export function isBookableDay(): boolean {
  return true
}

/** YYYY-MM-DD for the booking calendar day in `BOOKING_TIMEZONE`. */
export function toDateKey(date: Date): string {
  const { year, month, day } = getZonedCalendarParts(date, BOOKING_TIMEZONE)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return dateAtNoonInBookingTz(y, m, d)
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BOOKING_TIMEZONE,
  })
}

/** Next N calendar days that are bookable in `BOOKING_TIMEZONE`, starting from `from` (inclusive). */
export function getBookableDates(from: Date, count: number): Date[] {
  const out: Date[] = []
  const start = getZonedCalendarParts(from, BOOKING_TIMEZONE)
  const cur = dateAtNoonInBookingTz(start.year, start.month, start.day)
  while (out.length < count) {
    if (isBookableDay()) out.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

/** True when the slot window has fully ended in `BOOKING_TIMEZONE` (not when it starts). */
export function isSlotInPast(selectedDate: Date, slotId: SlotId, now: Date = new Date()): boolean {
  const selectedKey = toDateKey(selectedDate)
  const todayKey = toDateKey(now)
  if (selectedKey < todayKey) return true
  if (selectedKey > todayKey) return false

  const { hour, minute, second } = getZonedCalendarParts(now, BOOKING_TIMEZONE)
  const nowSeconds = hour * 3600 + minute * 60 + second
  const endSeconds = SLOT_END_MINUTES[slotId] * 60
  return nowSeconds > endSeconds
}

export function slotKey(operatorId: OperatorId, dateKey: string, slotId: SlotId): string {
  return `${operatorId}|${dateKey}|${slotId}`
}
