import type { OperatorId, ServiceKey, VehicleSize } from "../data/siteContent"
import { BOOKING_SAVE_ERROR, type BookingSaveErrorCode } from "./bookingErrors"
import type { SlotId } from "./schedule"

const BOOKINGS_KEY = "samc_bookings_v1"

const LOCAL_DEV_API = "http://localhost:8787"
/** From repo root `.env` at `vite build` time only (`VITE_BOOKINGS_API_BASE=...`). */
const configuredApiBase = import.meta.env.VITE_BOOKINGS_API_BASE?.replace(/\/$/, "").trim()
/** Resolved API base URL (public URL in prod builds when `.env` is set). */
export const BOOKINGS_API_BASE =
  configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : LOCAL_DEV_API

const hasPublicApiUrl = Boolean(configuredApiBase && configuredApiBase.length > 0)

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
  /** Line items from the quote (used by the API for confirmation emails). */
  lineItems?: { label: string; amount: number }[]
  /** Where the mobile unit should meet the customer (home, workplace, or business). */
  serviceAddress: string
  serviceNotes?: string
  contactName: string
  contactPhone: string
  contactEmail: string
  /** Legacy: may exist in older browser-stored bookings. */
  userId?: string
}

export type SaveBookingResult = {
  emailSent: boolean
  /** Client codes or server `sendBookingMails` reason strings. */
  emailError?: BookingSaveErrorCode | string
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

function getLocalBookings(): BookingRecord[] {
  return readJson<BookingRecord[]>(BOOKINGS_KEY, [])
}

function saveLocalBooking(booking: BookingRecord) {
  const all = getLocalBookings()
  writeJson(BOOKINGS_KEY, [...all, booking])
}

export function isSlotTaken(
  bookings: BookingRecord[],
  operatorId: OperatorId,
  dateKey: string,
  slotId: SlotId,
): boolean {
  return bookings.some(
    (b) =>
      b.operatorId === operatorId &&
      b.dateKey === dateKey &&
      b.slotId === slotId,
  )
}

export async function getBookings(): Promise<BookingRecord[]> {
  if (import.meta.env.PROD && !hasPublicApiUrl) {
    return getLocalBookings()
  }
  try {
    const res = await fetch(`${BOOKINGS_API_BASE}/api/bookings`)
    if (!res.ok) throw new Error(`GET /api/bookings failed: ${res.status}`)
    const data = (await res.json()) as BookingRecord[]
    writeJson(BOOKINGS_KEY, data)
    return data
  } catch {
    return getLocalBookings()
  }
}

export async function saveBooking(booking: BookingRecord): Promise<SaveBookingResult> {
  if (import.meta.env.PROD && !hasPublicApiUrl) {
    return { emailSent: false, emailError: BOOKING_SAVE_ERROR.MISSING_API_URL }
  }
  try {
    const res = await fetch(`${BOOKINGS_API_BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    })
    if (res.status === 409) {
      throw new Error("SLOT_TAKEN")
    }
    if (!res.ok) {
      throw new Error(`POST /api/bookings failed: ${res.status}`)
    }
    let emailSent = false
    let emailError: string | undefined
    try {
      const data = (await res.json()) as {
        emailSent?: boolean
        emailError?: string
      }
      emailSent = data.emailSent === true
      emailError = data.emailError
    } catch {
      /* non-JSON body */
    }
    return { emailSent, emailError }
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      throw error
    }
    if (isSlotTaken(getLocalBookings(), booking.operatorId, booking.dateKey, booking.slotId)) {
      throw new Error("SLOT_TAKEN")
    }
    saveLocalBooking(booking)
    return { emailSent: false, emailError: BOOKING_SAVE_ERROR.OFFLINE_LOCAL }
  }
}
