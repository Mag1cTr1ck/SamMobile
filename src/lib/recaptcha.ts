const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? ""

/** v2 Checkbox with explicit render (matches Google admin “reCAPTCHA type: v2 Checkbox”). */
declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      render: (container: HTMLElement, parameters: { sitekey: string; theme?: "light" | "dark" }) => number
      getResponse: (widgetId?: number) => string
      reset: (widgetId?: number) => void
    }
  }
}

export function isRecaptchaConfigured(): boolean {
  return SITE_KEY.length > 0
}

function isGrecaptchaReady(): boolean {
  const g = window.grecaptcha
  return Boolean(g && typeof g.ready === "function" && typeof g.render === "function")
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

/** Loads reCAPTCHA v2 API (`render=explicit` — widget is created via {@link renderRecaptchaCheckbox}). */
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
      const url = "https://www.google.com/recaptcha/api.js?render=explicit"
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
  const url = "https://www.recaptcha.net/recaptcha/api.js?render=explicit"
  await injectScript(url)
  await waitForGrecaptcha()
}

/** Renders the checkbox into `container` (empty element). Resolves with widget id for {@link getRecaptchaResponse} / {@link resetRecaptchaWidget}. */
export async function renderRecaptchaCheckbox(container: HTMLElement): Promise<number> {
  if (!SITE_KEY) throw new Error("recaptcha_not_configured")
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
  const g = window.grecaptcha!
  return new Promise((resolve, reject) => {
    g.ready(() => {
      try {
        const id = g.render(container, { sitekey: SITE_KEY, theme: "light" })
        if (typeof id === "number") resolve(id)
        else reject(new Error("recaptcha_render_failed"))
      } catch (e) {
        reject(e instanceof Error ? e : new Error("recaptcha_render_failed"))
      }
    })
  })
}

export function getRecaptchaResponse(widgetId: number): string {
  return window.grecaptcha?.getResponse(widgetId)?.trim() ?? ""
}

export function resetRecaptchaWidget(widgetId: number): void {
  try {
    window.grecaptcha?.reset(widgetId)
  } catch {
    /* ignore */
  }
}
