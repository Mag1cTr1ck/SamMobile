/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOOKINGS_API_BASE?: string
  /** reCAPTCHA v2 Checkbox site key (same type in Google admin). */
  readonly VITE_RECAPTCHA_SITE_KEY?: string
  /** Set to "true" to submit without a token if reCAPTCHA fails (server must omit RECAPTCHA_SECRET_KEY or bots accepted). */
  readonly VITE_RECAPTCHA_SOFT_FAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
