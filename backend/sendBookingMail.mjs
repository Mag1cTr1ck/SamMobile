import nodemailer from "nodemailer"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BUSINESS_NAME = "Sam's Mobile Cleaning Services"
const DEFAULT_BUSINESS_INBOX =
  process.env.SAMS_BUSINESS_EMAIL?.trim() || "sam@samsmobile.ky"
const SAMS_LOGO_PATH = join(__dirname, "..", "public", "logo-clean.png")
const STUDIO_LOGO_PATH = join(__dirname, "..", "public", "branding", "345studio-footer.png")
const SAMS_LOGO_CID = "sams-logo"
const STUDIO_LOGO_CID = "studio-logo"

const SLOT_LABELS = {
  s1: "7:00 – 8:30 am",
  s2: "8:30 – 10:00 am",
  s3: "10:00 – 11:30 am",
  s4: "12:30 – 2:00 pm",
  s5: "2:00 – 3:30 pm",
  s6: "3:30 – 5:00 pm",
  s7: "5:00 – 6:30 pm",
  s8: "6:30 – 8:00 pm",
}

const OPERATOR_NAMES = {
  markland: "Markland Moore",
  kevin: "Kevin Campbell",
}

const VEHICLE_LABELS = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDisplayDate(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number)
  if (!y || !m || !d) return String(dateKey)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function slotLabel(slotId) {
  return SLOT_LABELS[slotId] ?? String(slotId)
}

function operatorLabel(operatorId) {
  return OPERATOR_NAMES[operatorId] ?? String(operatorId)
}

function serviceLinesText(booking) {
  if (Array.isArray(booking.lineItems) && booking.lineItems.length > 0) {
    return booking.lineItems
      .map((l) => `  • ${l.label}: $${Number(l.amount).toFixed(2)} KYD`)
      .join("\n")
  }
  const keys = Array.isArray(booking.services) ? booking.services : []
  return keys.length ? keys.map((k) => `  • ${k}`).join("\n") : "  • (see booking details)"
}

function estimateText(booking) {
  if (booking.estimatedTotal != null && Number.isFinite(Number(booking.estimatedTotal))) {
    return `Estimated total: $${Number(booking.estimatedTotal).toFixed(2)} KYD`
  }
  if (booking.pricingNote) {
    return `Pricing: ${booking.pricingNote}`
  }
  return "Pricing: We will confirm on site if needed."
}

function servicesBlockHtml(booking) {
  if (Array.isArray(booking.lineItems) && booking.lineItems.length > 0) {
    return `<ul>${booking.lineItems
      .map(
        (l) =>
          `<li>${escapeHtml(l.label)}: $${Number(l.amount).toFixed(2)}</li>`,
      )
      .join("")}</ul>`
  }
  const keys = Array.isArray(booking.services) ? booking.services : []
  return `<p>${escapeHtml(keys.join(", ") || "As booked online")}</p>`
}

function logoHeaderHtml() {
  if (!existsSync(SAMS_LOGO_PATH)) return ""
  return `<div style="margin:0 0 0.35rem"><img src="cid:${SAMS_LOGO_CID}" alt="${escapeHtml(BUSINESS_NAME)} logo" width="88" height="14" style="display:block;width:88px;max-width:88px;height:14px;max-height:14px;border:0;outline:none;text-decoration:none"/></div>`
}

function logoFooterHtml() {
  if (!existsSync(STUDIO_LOGO_PATH)) return ""
  return `<a href="https://345studio.ky" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:1rem;line-height:0"><img src="cid:${STUDIO_LOGO_CID}" alt="345Studio" style="display:block;max-width:200px;width:auto;height:auto;border:0;outline:none;text-decoration:none"/></a>`
}

function inlineLogoAttachments() {
  const attachments = []
  if (existsSync(SAMS_LOGO_PATH)) {
    attachments.push({
      filename: "sams-logo.png",
      path: SAMS_LOGO_PATH,
      cid: SAMS_LOGO_CID,
    })
  }
  if (existsSync(STUDIO_LOGO_PATH)) {
    attachments.push({
      filename: "345studio-footer.png",
      path: STUDIO_LOGO_PATH,
      cid: STUDIO_LOGO_CID,
    })
  }
  return attachments
}

function buildCustomerMail(booking) {
  const dateStr = formatDisplayDate(booking.dateKey)
  const slot = slotLabel(booking.slotId)
  const subject = `Booking confirmed — ${BUSINESS_NAME} — ${dateStr}`
  const est = estimateText(booking)
  const text = `Hi ${booking.contactName},

Thank you for booking with ${BUSINESS_NAME}.

Your appointment
  Date: ${dateStr}
  Time window: ${slot}
  Operator: ${operatorLabel(booking.operatorId)}
  Service location: ${booking.serviceAddress}
  Vehicle size: ${VEHICLE_LABELS[booking.vehicleSize] ?? booking.vehicleSize}

Services & estimate
${serviceLinesText(booking)}

${est}

Reference: ${booking.id}

We will meet you at your service location during the time window above. If you need to make a change, WhatsApp or call us at 345 927-7227 (Cayman).

— ${BUSINESS_NAME}
`
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.55;color:#0f172a;max-width:8rem">
  ${logoHeaderHtml()}
  <p>Hi ${escapeHtml(booking.contactName)},</p>
  <p>Thank you for booking with <strong>${escapeHtml(BUSINESS_NAME)}</strong>.</p>
  <h2 style="font-size:1rem;margin:1.25rem 0 0.5rem">Your appointment</h2>
  <table style="border-collapse:collapse;font-size:0.95rem">
    <tr><td style="padding:0.25rem 1rem 0.25rem 0;vertical-align:top"><strong>Date</strong></td><td>${escapeHtml(dateStr)}</td></tr>
    <tr><td style="padding:0.25rem 1rem 0.25rem 0"><strong>Slot</strong></td><td>${escapeHtml(slot)}</td></tr>
    <tr><td style="padding:0.25rem 1rem 0.25rem 0"><strong>Operator</strong></td><td>${escapeHtml(operatorLabel(booking.operatorId))}</td></tr>
    <tr><td style="padding:0.25rem 1rem 0.25rem 0;vertical-align:top"><strong>Location</strong></td><td>${escapeHtml(booking.serviceAddress)}</td></tr>
    <tr><td style="padding:0.25rem 1rem 0.25rem 0"><strong>Vehicle size</strong></td><td>${escapeHtml(VEHICLE_LABELS[booking.vehicleSize] ?? booking.vehicleSize)}</td></tr>
  </table>
  <h2 style="font-size:1rem;margin:1.25rem 0 0.5rem">Services &amp; estimate</h2>
  ${servicesBlockHtml(booking)}
  <p><strong>${escapeHtml(est)}</strong></p>
  <p>We will meet you at your service location at the alloted time. If you need to make any changes, WhatsApp or call us at &nbsp;<strong>345 927-7227</strong>.</p>
  <p>${escapeHtml(BUSINESS_NAME)}</p>
  ${logoFooterHtml()}
</body>
</html>`
  return { subject, text, html }
}

function buildBusinessMail(booking, businessInbox) {
  const dateStr = formatDisplayDate(booking.dateKey)
  const slot = slotLabel(booking.slotId)
  const subject = `New booking: ${booking.contactName} — ${dateStr} · ${slot}`
  const est = estimateText(booking)
  const text = `New web booking received.

Booking ID: ${booking.id}
Submitted (ISO): ${booking.createdAt}

Customer
  Name: ${booking.contactName}
  Phone: ${booking.contactPhone}
  Email: ${booking.contactEmail}

Appointment
  Date: ${dateStr}
  Time window: ${slot}
  Operator: ${operatorLabel(booking.operatorId)} (${booking.operatorId})
  Notify inbox: ${businessInbox}

Service address:
${booking.serviceAddress}

Vehicle: ${VEHICLE_LABELS[booking.vehicleSize] ?? booking.vehicleSize}

Services & estimate
${serviceLinesText(booking)}

${est}
`
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.55;color:#0f172a;max-width:40rem">
  ${logoHeaderHtml()}
  <h1 style="font-size:1.1rem">New web booking</h1>
  <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}<br/>
  <strong>Submitted:</strong> ${escapeHtml(booking.createdAt)}</p>
  <h2 style="font-size:1rem">Customer</h2>
  <table style="border-collapse:collapse;font-size:0.95rem">
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Name</strong></td><td>${escapeHtml(booking.contactName)}</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Phone</strong></td><td>${escapeHtml(booking.contactPhone)}</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Email</strong></td><td>${escapeHtml(booking.contactEmail)}</td></tr>
  </table>
  <h2 style="font-size:1rem">Appointment</h2>
  <table style="border-collapse:collapse;font-size:0.95rem">
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Date</strong></td><td>${escapeHtml(dateStr)}</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Slot</strong></td><td>${escapeHtml(slot)}</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Operator</strong></td><td>${escapeHtml(operatorLabel(booking.operatorId))} (${escapeHtml(booking.operatorId)})</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0;vertical-align:top"><strong>Address</strong></td><td>${escapeHtml(booking.serviceAddress)}</td></tr>
    <tr><td style="padding:0.2rem 1rem 0.2rem 0"><strong>Vehicle</strong></td><td>${escapeHtml(VEHICLE_LABELS[booking.vehicleSize] ?? booking.vehicleSize)}</td></tr>
  </table>
  <h2 style="font-size:1rem">Services &amp; estimate</h2>
  ${servicesBlockHtml(booking)}
  <p><strong>${escapeHtml(est)}</strong></p>
  ${logoFooterHtml()}
</body>
</html>`
  return { subject, text, html }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sends confirmation to the customer and a copy to the business inbox.
 * Requires MAILERSEND_SMTP_USER, MAILERSEND_SMTP_PASS, and MAIL_FROM_EMAIL.
 */
export async function sendBookingMails(booking) {
  const host = process.env.MAILERSEND_SMTP_HOST?.trim() || "smtp.mailersend.net"
  const port = Number(process.env.MAILERSEND_SMTP_PORT ?? 587)
  const user = process.env.MAILERSEND_SMTP_USER?.trim()
  const pass = process.env.MAILERSEND_SMTP_PASS?.trim()
  const fromEmail = process.env.MAIL_FROM_EMAIL?.trim()
  const fromName = process.env.MAIL_FROM_NAME?.trim() || BUSINESS_NAME
  const businessInbox = (process.env.MAIL_BUSINESS_INBOX?.trim() || DEFAULT_BUSINESS_INBOX).trim()

  if (!user || !pass || !fromEmail) {
    console.warn(
      "[bookings] MailerSend SMTP skipped: set MAILERSEND_SMTP_USER, MAILERSEND_SMTP_PASS, and MAIL_FROM_EMAIL in .env.",
    )
    return { sent: false, reason: "missing_env" }
  }

  if (!EMAIL_RE.test(String(booking.contactEmail ?? ""))) {
    console.warn("[bookings] MailerSend SMTP skipped: invalid customer email.")
    return { sent: false, reason: "invalid_customer_email" }
  }

  if (!EMAIL_RE.test(businessInbox)) {
    console.warn("[bookings] MailerSend SMTP skipped: invalid MAIL_BUSINESS_INBOX / SAMS_BUSINESS_EMAIL.")
    return { sent: false, reason: "invalid_business_inbox" }
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  })

  const customer = buildCustomerMail(booking)
  const internal = buildBusinessMail(booking, businessInbox)
  const attachments = inlineLogoAttachments()

  let customerSent = false
  let businessSent = false
  let customerError = ""
  let businessError = ""

  try {
    await transport.sendMail({
      to: booking.contactEmail,
      from: `${fromName} <${fromEmail}>`,
      replyTo: businessInbox,
      subject: customer.subject,
      text: customer.text,
      html: customer.html,
      attachments,
    })
    customerSent = true
  } catch (err) {
    customerError = err?.message ?? "smtp_error"
    console.error("[bookings] Customer email send failed:", err)
  }

  try {
    await transport.sendMail({
      to: businessInbox,
      from: `${fromName} <${fromEmail}>`,
      replyTo: booking.contactEmail,
      subject: internal.subject,
      text: internal.text,
      html: internal.html,
      attachments,
    })
    businessSent = true
  } catch (err) {
    businessError = err?.message ?? "smtp_error"
    console.error("[bookings] Business email send failed:", err)
  }

  return {
    sent: customerSent,
    reason:
      customerSent && businessSent
        ? undefined
        : `customer:${customerSent ? "ok" : customerError || "failed"}|business:${businessSent ? "ok" : businessError || "failed"}`,
  }
}
