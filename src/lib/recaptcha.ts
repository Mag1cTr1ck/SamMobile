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

function isGrecaptchaReady(): boolean {
  const g = window.grecaptcha
  return Boolean(g && typeof g.ready === "function" && typeof g.execute === "function")
}

async function waitForGrecaptcha(maxMs = 10_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (isGrecaptchaReady()) return
    await new Promise((r) => setTimeout(r, 40))
  }
  throw new Error("recaptcha_timeout")
}

let scriptLoadPromise: Promise<void> | null = null

export function loadRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve()
  if (typeof window === "undefined") return Promise.resolve()
  if (isGrecaptchaReady()) return Promise.resolve()

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const fail = (err: Error) => {
        scriptLoadPromise = null
        reject(err)
      }
      const existing = document.querySelector('script[src*="google.com/recaptcha/api.js"]')
      if (existing) {
        waitForGrecaptcha().then(resolve).catch(fail)
        return
      }
      const script = document.createElement("script")
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
      script.async = true
      script.defer = true
      script.onload = () => {
        waitForGrecaptcha().then(resolve).catch(fail)
      }
      script.onerror = () => fail(new Error("recaptcha_script_load_failed"))
      document.head.appendChild(script)
    })
  }
  return scriptLoadPromise
}

/** v3 token for action `booking`; `null` when no site key (dev / not configured). */
export async function getRecaptchaToken(): Promise<string | null> {
  if (!SITE_KEY) return null
  await loadRecaptchaScript()
  const g = window.grecaptcha
  if (!g?.ready || !g.execute) {
    throw new Error("recaptcha_not_ready")
  }
  return new Promise((resolve, reject) => {
    g.ready(() => {
      g.execute(SITE_KEY, { action: "booking" }).then(resolve).catch(reject)
    })
  })
}
