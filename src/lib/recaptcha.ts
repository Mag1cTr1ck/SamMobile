const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? ""

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

export function isRecaptchaConfigured(): boolean {
  return SITE_KEY.length > 0
}

export function loadRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve()
  if (typeof window === "undefined") return Promise.resolve()
  if (window.grecaptcha?.ready) return Promise.resolve()
  const existing = document.querySelector('script[src*="google.com/recaptcha/api.js"]')
  if (existing && window.grecaptcha) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("recaptcha_script_load_failed"))
    document.head.appendChild(script)
  })
}

/** v3 token for action `booking`; `null` when no site key (dev / not configured). */
export async function getRecaptchaToken(): Promise<string | null> {
  if (!SITE_KEY) return null
  await loadRecaptchaScript()
  return new Promise((resolve, reject) => {
    const g = window.grecaptcha
    if (!g?.ready || !g.execute) {
      reject(new Error("recaptcha_not_ready"))
      return
    }
    g.ready(() => {
      g.execute(SITE_KEY, { action: "booking" }).then(resolve).catch(reject)
    })
  })
}
