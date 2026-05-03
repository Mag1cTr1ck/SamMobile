import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig } from "vite"

const BOOKINGS_BOOT_GLOBAL = "__SAMSMOBILE_BOOKINGS_BOOT__"

/** Bakes public/bookings-api.json into index.html so production never depends on a separate fetch for the API origin. */
function bookingsBootInject(): Plugin {
  return {
    name: "bookings-boot-inject",
    apply: "build",
    transformIndexHtml(html) {
      const file = path.resolve(process.cwd(), "public", "bookings-api.json")
      if (!existsSync(file)) return html
      try {
        const data = JSON.parse(readFileSync(file, "utf8")) as {
          baseUrl?: string
          sameOriginApi?: boolean
        }
        const payload: { baseUrl: string; sameOriginApi: boolean } = {
          baseUrl:
            typeof data.baseUrl === "string" ? data.baseUrl.replace(/\/$/, "").trim() : "",
          sameOriginApi: data.sameOriginApi === true,
        }
        if (!payload.sameOriginApi && payload.baseUrl.length === 0) return html
        const json = JSON.stringify(payload).replace(/</g, "\\u003c")
        const script = `<script>window.${BOOKINGS_BOOT_GLOBAL}=${json}</script>`
        return html.replace("<head>", `<head>${script}`)
      } catch {
        return html
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), bookingsBootInject()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})
