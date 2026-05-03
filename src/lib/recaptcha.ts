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

async function waitForGrecaptcha(maxMs = 15_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (isGrecaptchaReady()) return
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error("recaptcha_timeout")
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error("recaptcha_script_load_failed"))
    }
    document.head.appendChild(script)
  })
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
      const existing =
        document.querySelector('script[src*="google.com/recaptcha/api.js"]') ||
        document.querySelector('script[src*="recaptcha.net/recaptcha/api.js"]')
      if (existing) {
        waitForGrecaptcha().then(resolve).catch(fail)
        return
      }
      const url = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
      injectScript(url)
        .then(() => waitForGrecaptcha().then(resolve).catch(fail))
        .catch(fail)
    })
  }
  return scriptLoadPromise
}

async function loadRecaptchaNetFallback(): Promise<void> {
  document.querySelectorAll('script[src*="recaptcha/api.js"]').forEach((el) => el.remove())
  scriptLoadPromise = null
  const url = `https://www.recaptcha.net/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
  await injectScript(url)
  await waitForGrecaptcha()
}

function executeOnce(): Promise<string> {
  const g = window.grecaptcha
  if (!g?.ready || !g.execute) {
    return Promise.reject(new Error("recaptcha_not_ready"))
  }
  return new Promise((resolve, reject) => {
    g.ready(() => {
      g.execute(SITE_KEY, { action: "booking" }).then(resolve).catch(reject)
    })
  })
}

/** v3 token for action `booking`; `null` when no site key (dev / not configured). */
export async function getRecaptchaToken(): Promise<string | null> {
  if (!SITE_KEY) return null
  try {
    await loadRecaptchaScript()
  } catch {
    try {
      await loadRecaptchaNetFallback()
    } catch {
      throw new Error("recaptcha_script_load_failed")
    }
  }
  if (!isGrecaptchaReady()) {
    throw new Error("recaptcha_not_ready")
  }

  const delays = [0, 400, 900]
  let lastErr: unknown
  for (const ms of delays) {
    if (ms > 0) await new Promise((r) => setTimeout(r, ms))
    try {
      const token = await executeOnce()
      if (typeof token === "string" && token.length > 20) return token
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("recaptcha_execute_failed")
}
