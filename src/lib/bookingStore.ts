import type { OperatorId, ServiceKey, VehicleSize } from "../data/siteContent"
import { BOOKING_SAVE_ERROR, type BookingSaveErrorCode } from "./bookingErrors"
import type { SlotId } from "./schedule"

const BOOKINGS_KEY = "samc_bookings_v1"

const LOCAL_DEV_API = "http://localhost:8787"

const viteApiBase = import.meta.env.VITE_BOOKINGS_API_BASE?.replace(/\/$/, "").trim() ?? ""

let resolvedApiBasePromise: Promise<string> | null = null

function normalizeApiBase(url: string): string {
  return url.replace(/\/$/, "").trim()
}

/**
 * Resolves the booking API origin in order:
 * 1. `VITE_BOOKINGS_API_BASE` (baked in at `vite build`)
 * 2. Production only: `GET /bookings-api.json`:
 *    - `{ "sameOriginApi": true }` → `window.location.origin` (use with Firebase Hosting → Cloud Run rewrite for `/api/**`)
 *    - or `{ "baseUrl": "https://resolved-host.example" }` (subdomain must exist in DNS)
 * 3. `http://localhost:8787` for local dev
 */
export function getBookingsApiBase(): Promise<string> {
  if (!resolvedApiBasePromise) {
    resolvedApiBasePromise = (async () => {
      if (viteApiBase.length > 0) {
        return viteApiBase
      }
      if (import.meta.env.PROD) {
        try {
          const res = await fetch("/bookings-api.json", { cache: "no-store" })
          if (res.ok) {
            const data = (await res.json()) as { baseUrl?: string; sameOriginApi?: boolean }
            if (data.sameOriginApi === true && typeof window !== "undefined" && window.location?.origin) {
              return normalizeApiBase(window.location.origin)
            }
            const fromJson =
              typeof data.baseUrl === "string" ? normalizeApiBase(data.baseUrl) : ""
            if (fromJson.length > 0) {
              return fromJson
            }
          }
        } catch {
          /* fall through to local default */
        }
      }
      return LOCAL_DEV_API
    })()
  }
  return resolvedApiBasePromise
}

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
  const base = await getBookingsApiBase()
  if (import.meta.env.PROD && base === LOCAL_DEV_API) {
    return getLocalBookings()
  }
  try {
    const res = await fetch(`${base}/api/bookings`)
    if (!res.ok) throw new Error(`GET /api/bookings failed: ${res.status}`)
    const data = (await res.json()) as BookingRecord[]
    writeJson(BOOKINGS_KEY, data)
    return data
  } catch {
    return getLocalBookings()
  }
}

export async function saveBooking(
  booking: BookingRecord,
  options?: { recaptchaToken: string | null },
): Promise<SaveBookingResult> {
  const base = await getBookingsApiBase()
  if (import.meta.env.PROD && base === LOCAL_DEV_API) {
    return { emailSent: false, emailError: BOOKING_SAVE_ERROR.MISSING_API_URL }
  }
  const token = options?.recaptchaToken
  const body =
    token != null && token.length > 0
      ? { ...booking, recaptchaToken: token }
      : { ...booking }

  try {
    const res = await fetch(`${base}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 409) {
      throw new Error("SLOT_TAKEN")
    }
    if (res.status === 403) {
      return { emailSent: false, emailError: BOOKING_SAVE_ERROR.RECAPTCHA_FAILED }
    }
    if (res.status === 400) {
      try {
        const errBody = (await res.json()) as { code?: string }
        if (errBody.code === "invalid_phone") {
          return { emailSent: false, emailError: BOOKING_SAVE_ERROR.INVALID_PHONE }
        }
      } catch {
        /* ignore */
      }
      throw new Error(`POST /api/bookings failed: ${res.status}`)
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
    const locals = getLocalBookings()
    if (isSlotTaken(locals, booking.operatorId, booking.dateKey, booking.slotId)) {
      return { emailSent: false, emailError: BOOKING_SAVE_ERROR.OFFLINE_SLOT_TAKEN }
    }
    saveLocalBooking(booking)
    return { emailSent: false, emailError: BOOKING_SAVE_ERROR.OFFLINE_LOCAL }
  }
}
