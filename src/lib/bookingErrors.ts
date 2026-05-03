/** Known client-side outcomes from `saveBooking` (and echoed server `emailError` where applicable). */
export const BOOKING_SAVE_ERROR = {
  MISSING_API_URL: "missing_bookings_api_url",
  OFFLINE_LOCAL: "offline_local_storage",
} as const

export type BookingSaveErrorCode = (typeof BOOKING_SAVE_ERROR)[keyof typeof BOOKING_SAVE_ERROR]
