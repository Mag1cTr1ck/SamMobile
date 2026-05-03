/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BOOKINGS_API_BASE?: string
  readonly VITE_RECAPTCHA_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
