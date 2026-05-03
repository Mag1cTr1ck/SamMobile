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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })
  res.end(JSON.stringify(payload))
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
  return requiredFields.every((field) => String(booking[field] ?? "").trim().length > 0)
}

ensureCsvFile()

createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    })
    res.end()
    return
  }

  if (req.url === "/api/bookings" && req.method === "GET") {
    sendJson(res, 200, readBookings())
    return
  }

  if (req.url === "/api/bookings" && req.method === "POST") {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
    })
    req.on("end", async () => {
      try {
        const booking = JSON.parse(body || "{}")
        if (!validateBooking(booking)) {
          sendJson(res, 400, { error: "Invalid booking payload." })
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
          sendJson(res, 409, { error: "Slot is already booked." })
          return
        }
        appendBooking(booking)
        const mailResult = await sendBookingMails(booking)
        sendJson(res, 201, {
          ok: true,
          emailSent: mailResult.sent === true,
          ...(mailResult.reason ? { emailError: mailResult.reason } : {}),
        })
      } catch {
        sendJson(res, 400, { error: "Malformed JSON payload." })
      }
    })
    return
  }

  sendJson(res, 404, { error: "Not found" })
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
})
