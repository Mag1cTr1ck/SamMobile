import type { OperatorId, ServiceKey, VehicleSize } from "../data/siteContent"
import type { SlotId } from "./schedule"

const BOOKINGS_KEY = "samc_bookings_v1"

export type BookingRecord = {
  id: string
  createdAt: string
  operatorId: OperatorId
  dateKey: string
  slotId: SlotId
  services: ServiceKey[]
  vehicleSize: VehicleSize
  estimatedTotal: number | null
  pricingNote?: string
  /** Where the mobile unit should meet the customer (home, workplace, or business). */
  serviceAddress: string
  serviceNotes?: string
  contactName: string
  contactPhone: string
  contactEmail: string
  /** Legacy: may exist in older browser-stored bookings. */
  userId?: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getBookings(): BookingRecord[] {
  return readJson<BookingRecord[]>(BOOKINGS_KEY, [])
}

export function saveBooking(booking: BookingRecord) {
  const all = getBookings()
  writeJson(BOOKINGS_KEY, [...all, booking])
}

export function isSlotTaken(
  operatorId: OperatorId,
  dateKey: string,
  slotId: SlotId,
): boolean {
  return getBookings().some(
    (b) =>
      b.operatorId === operatorId &&
      b.dateKey === dateKey &&
      b.slotId === slotId,
  )
}
