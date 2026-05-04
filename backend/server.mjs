import dotenv from "dotenv"
import { createServer } from "node:http"
import { sendBookingMails } from "./sendBookingMail.mjs"
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootEnvPath = join(__dirname, "..", ".env")
dotenv.config({ path: rootEnvPath })

if (!existsSync(rootEnvPath)) {
  console.warn(
    `[bookings] No .env file at ${rootEnvPath}. Add MailerSend SMTP variables — confirmation emails will not send until then.`,
  )
} else if (
  !process.env.MAILERSEND_SMTP_USER?.trim() ||
  !process.env.MAILERSEND_SMTP_PASS?.trim() ||
  !process.env.MAIL_FROM_EMAIL?.trim()
) {
  console.warn(
    "[bookings] .env exists but MAILERSEND_SMTP_USER, MAILERSEND_SMTP_PASS, or MAIL_FROM_EMAIL is missing/empty — customer confirmation emails will not be sent.",
  )
}
const dataDir = join(__dirname, "data")
const csvPath = join(dataDir, "bookings.csv")
const port = Number(process.env.PORT ?? 8787)

const ROUTES = {
  bookings: "/api/bookings",
  health: "/health",
}

/** Guard against oversized JSON POST bodies. */
const MAX_JSON_BODY_BYTES = 100 * 1024

/** CORS for browser clients (e.g. samsmobile.ky → run.app). Reflect Origin when sent; echo preflight headers. */
function corsHeaders(req) {
  const origin = req.headers.origin
  const allowOrigin =
    typeof origin === "string" && origin.length > 0 ? origin : "*"
  const reqHdrRaw = req.headers["access-control-request-headers"]
  const allowHeaders =
    typeof reqHdrRaw === "string" && reqHdrRaw.trim().length > 0
      ? reqHdrRaw
      : "Content-Type"
  return {
    Vary: "Origin",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function requestPathname(req) {
  const raw = req.url || "/"
  const q = raw.indexOf("?")
  return q === -1 ? raw : raw.slice(0, q)
}

const CSV_HEADERS = [
  "id",
  "createdAt",
  "operatorId",
  "dateKey",
  "slotId",
  "services",
  "vehicleSize",
  "estimatedTotal",
  "pricingNote",
  "serviceAddress",
  "serviceNotes",
  "contactName",
  "contactPhone",
  "contactEmail",
]

function ensureCsvFile() {
  mkdirSync(dataDir, { recursive: true })
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, `${CSV_HEADERS.join(",")}\n`, "utf8")
  }
}

function csvEscape(value) {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function parseCsvLine(line) {
  const row = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      row.push(current)
      current = ""
      continue
    }
    current += char
  }
  row.push(current)
  return row
}

function rowToBooking(row) {
  const values = CSV_HEADERS.reduce((acc, key, i) => {
    acc[key] = row[i] ?? ""
    return acc
  }, {})
  return {
    id: values.id,
    createdAt: values.createdAt,
    operatorId: values.operatorId,
    dateKey: values.dateKey,
    slotId: values.slotId,
    services: values.services ? values.services.split("|").filter(Boolean) : [],
    vehicleSize: values.vehicleSize,
    estimatedTotal:
      values.estimatedTotal === "" ? null : Number.parseFloat(values.estimatedTotal),
    pricingNote: values.pricingNote || undefined,
    serviceAddress: values.serviceAddress,
    serviceNotes: values.serviceNotes || undefined,
    contactName: values.contactName,
    contactPhone: values.contactPhone,
    contactEmail: values.contactEmail,
  }
}

function readBookings() {
  ensureCsvFile()
  const raw = readFileSync(csvPath, "utf8")
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length <= 1) return []
  return lines.slice(1).map((line) => rowToBooking(parseCsvLine(line)))
}

function appendBooking(booking) {
  const fields = [
    booking.id,
    booking.createdAt,
    booking.operatorId,
    booking.dateKey,
    booking.slotId,
    Array.isArray(booking.services) ? booking.services.join("|") : "",
    booking.vehicleSize,
    booking.estimatedTotal ?? "",
    booking.pricingNote ?? "",
    booking.serviceAddress ?? "",
    booking.serviceNotes ?? "",
    booking.contactName ?? "",
    booking.contactPhone ?? "",
    booking.contactEmail ?? "",
  ]
  appendFileSync(csvPath, `${fields.map(csvEscape).join(",")}\n`, "utf8")
}

function sendJson(req, res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(req),
  })
  res.end(JSON.stringify(payload))
}

async function verifyRecaptchaToken(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim()
  if (!secret) {
    return { ok: true, skipped: true }
  }
  if (!token) {
    return { ok: false }
  }
  const params = new URLSearchParams()
  params.set("secret", secret)
  params.set("response", token)
  if (remoteIp) params.set("remoteip", remoteIp)
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const data = await res.json()
  if (!data.success) {
    return { ok: false }
  }
  const minScore = Number.parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? "0.35")
  if (typeof data.score === "number" && Number.isFinite(minScore) && data.score < minScore) {
    return { ok: false }
  }
  return { ok: true, skipped: false }
}

function bookingPhoneDigits(phone) {
  return String(phone ?? "").replace(/\D/g, "")
}

function validateBookingPhoneServer(phone) {
  const d = bookingPhoneDigits(phone)
  if (d.length < 7 || d.length > 15) return false
  if (/^(\d)\1{6,}$/.test(d)) return false
  return true
}

function validateBooking(booking) {
  const requiredFields = [
    "id",
    "createdAt",
    "operatorId",
    "dateKey",
    "slotId",
    "vehicleSize",
    "serviceAddress",
    "contactName",
    "contactPhone",
    "contactEmail",
  ]
  if (!requiredFields.every((field) => String(booking[field] ?? "").trim().length > 0)) {
    return { ok: false, error: "invalid_payload" }
  }
  if (!validateBookingPhoneServer(booking.contactPhone)) {
    return { ok: false, error: "invalid_phone" }
  }
  return { ok: true }
}

ensureCsvFile()

createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req))
    res.end()
    return
  }

  const path = requestPathname(req)

  if (path === ROUTES.health && req.method === "GET") {
    sendJson(req, res, 200, { ok: true, service: "samsmobile-bookings" })
    return
  }

  if (path === ROUTES.bookings && req.method === "GET") {
    sendJson(req, res, 200, readBookings())
    return
  }

  if (path === ROUTES.bookings && req.method === "POST") {
    let body = ""
    let size = 0
    let tooLarge = false
    req.on("data", (chunk) => {
      if (tooLarge) return
      size += chunk.length
      if (size > MAX_JSON_BODY_BYTES) {
        tooLarge = true
        return
      }
      body += chunk
    })
    req.on("end", async () => {
      if (tooLarge) {
        sendJson(req, res, 413, { error: "Request body too large." })
        return
      }
      try {
        const raw = JSON.parse(body || "{}")
        const recaptchaToken =
          typeof raw.recaptchaToken === "string" ? raw.recaptchaToken.trim() : ""
        delete raw.recaptchaToken
        const booking = raw

        const forwardedRaw = req.headers["x-forwarded-for"]
        const forwarded = Array.isArray(forwardedRaw) ? forwardedRaw[0] : forwardedRaw
        const remoteIp =
          typeof forwarded === "string"
            ? forwarded.split(",")[0]?.trim() || ""
            : req.socket.remoteAddress || ""

        const captchaOk = await verifyRecaptchaToken(recaptchaToken, remoteIp)
        if (!captchaOk.ok) {
          sendJson(req, res, 403, { error: "recaptcha_failed" })
          return
        }

        const bookingValidation = validateBooking(booking)
        if (!bookingValidation.ok) {
          if (bookingValidation.error === "invalid_phone") {
            sendJson(req, res, 400, { error: "Invalid phone number.", code: "invalid_phone" })
          } else {
            sendJson(req, res, 400, { error: "Invalid booking payload." })
          }
          return
        }
        const bookings = readBookings()
        const conflict = bookings.some(
          (b) =>
            b.operatorId === booking.operatorId &&
            b.dateKey === booking.dateKey &&
            b.slotId === booking.slotId,
        )
        if (conflict) {
          sendJson(req, res, 409, { error: "Slot is already booked." })
          return
        }
        appendBooking(booking)
        const mailResult = await sendBookingMails(booking)
        sendJson(req, res, 201, {
          ok: true,
          emailSent: mailResult.sent === true,
          ...(typeof mailResult.businessNotified === "boolean"
            ? { businessNotified: mailResult.businessNotified }
            : {}),
          ...(mailResult.reason ? { emailError: mailResult.reason } : {}),
        })
      } catch (err) {
        if (err instanceof SyntaxError) {
          sendJson(req, res, 400, { error: "Malformed JSON payload." })
          return
        }
        console.error("[bookings] POST /api/bookings failed:", err)
        sendJson(req, res, 500, { error: "Server error while processing booking." })
      }
    })
    return
  }

  sendJson(req, res, 404, { error: "Not found" })
}).listen(port, "0.0.0.0", () => {
  console.log(`Bookings API listening on port ${port} (bind 0.0.0.0)`)
  console.log(`CSV file: ${csvPath}`)
  if (
    process.env.MAILERSEND_SMTP_USER?.trim() &&
    process.env.MAILERSEND_SMTP_PASS?.trim() &&
    process.env.MAIL_FROM_EMAIL?.trim()
  ) {
    console.log(
      "[bookings] MailerSend SMTP: configured (confirmation emails will be sent after each booking).",
    )
  }
  if (process.env.RECAPTCHA_SECRET_KEY?.trim()) {
    console.log("[bookings] reCAPTCHA: secret key loaded (POST /api/bookings will be verified).")
  } else {
    console.log(
      "[bookings] reCAPTCHA: RECAPTCHA_SECRET_KEY not set — verification skipped (set for production).",
    )
  }
})
