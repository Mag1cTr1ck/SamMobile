import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ADDON_SERVICE_KEYS,
  addonBookingOptions,
  operators,
  vehicleSizeLabels,
  whatsAppHref,
  type AddonServiceKey,
  type OperatorId,
  type ServiceKey,
  type VehicleSize,
} from "../data/siteContent"
import { formatKyd, getPriceBreakdown, getUnitPricesForVehicle } from "../lib/pricing"
import { getBookings, isSlotTaken, saveBooking, type BookingRecord } from "../lib/bookingStore"
import {
  formatDisplayDate,
  getBookableDates,
  isSlotInPast,
  TIME_SLOTS,
  toDateKey,
  type SlotId,
} from "../lib/schedule"

function emptyAddonSelection(): Record<AddonServiceKey, boolean> {
  return Object.fromEntries(
    ADDON_SERVICE_KEYS.map((k) => [k, false]),
  ) as Record<AddonServiceKey, boolean>
}

function buildServices(
  selInterior: boolean,
  selExterior: boolean,
  selWashVacuum: boolean,
  selFullDetail: boolean,
  addonSel: Record<AddonServiceKey, boolean>,
): ServiceKey[] {
  if (selFullDetail) return ["full_detail"]
  const addons = ADDON_SERVICE_KEYS.filter((k) => addonSel[k])
  if (selWashVacuum) {
    return ["wash_vacuum", ...addons]
  }
  const mains: ServiceKey[] = []
  if (selInterior) mains.push("interior")
  if (selExterior) mains.push("exterior")
  if (mains.length === 0) return []
  return [...mains, ...addons]
}

export function BookingSection() {
  const [selectedDate, setSelectedDate] = useState(() => getBookableDates(new Date(), 1)[0])
  const [selInterior, setSelInterior] = useState(false)
  const [selExterior, setSelExterior] = useState(false)
  const [selWashVacuum, setSelWashVacuum] = useState(false)
  const [selFullDetail, setSelFullDetail] = useState(false)
  const [addonSel, setAddonSel] = useState(emptyAddonSelection)
  const [vehicleSize, setVehicleSize] = useState<VehicleSize>("small")
  const [selection, setSelection] = useState<{
    operatorId: OperatorId
    slotId: SlotId
  } | null>(null)

  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [serviceAddress, setServiceAddress] = useState("")

  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [bookingRefresh, setBookingRefresh] = useState(0)
  /** Bumps on an interval so “today’s” slot list refreshes as real time passes (memo was freezing it). */
  const [slotClockTick, setSlotClockTick] = useState(0)

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate])
  const dateStrip = useMemo(() => {
    void slotClockTick
    return getBookableDates(new Date(), 28)
  }, [slotClockTick])
  const visibleSlots = useMemo(() => {
    void slotClockTick
    return TIME_SLOTS.filter((slot) => !isSlotInPast(selectedDate, slot.id))
  }, [selectedDate, slotClockTick])

  const unitPrices = useMemo(() => getUnitPricesForVehicle(vehicleSize), [vehicleSize])

  const addonsAllowed =
    !selFullDetail && (selWashVacuum || selInterior || selExterior)

  const services = useMemo(
    () =>
      buildServices(
        selInterior,
        selExterior,
        selWashVacuum,
        selFullDetail,
        addonSel,
      ),
    [selInterior, selExterior, selWashVacuum, selFullDetail, addonSel],
  )

  const hasServiceSelection =
    selFullDetail || selWashVacuum || selInterior || selExterior

  const priceBreakdown = useMemo(
    () => getPriceBreakdown(services, vehicleSize),
    [services, vehicleSize],
  )

  useEffect(() => {
    let cancelled = false
    getBookings().then((rows) => {
      if (!cancelled) setBookings(rows)
    })
    return () => {
      cancelled = true
    }
  }, [bookingRefresh])

  useEffect(() => {
    const id = window.setInterval(() => setSlotClockTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  async function handleBook(e: FormEvent) {
    e.preventDefault()
    setSubmitMessage(null)
    if (!selection) {
      setSubmitMessage("Please choose an operator and time slot before confirming.")
      return
    }

    if (isSlotInPast(selectedDate, selection.slotId)) {
      setSubmitMessage("That slot’s time window has ended. Please choose another slot.")
      setSelection(null)
      return
    }

    if (!hasServiceSelection) {
      setSubmitMessage("Please select at least one main service package.")
      return
    }

    if (!selFullDetail && priceBreakdown.total === null) {
      setSubmitMessage("Please review your package and add-on selections to see a valid estimate.")
      return
    }

    const contactName = guestName.trim()
    const contactPhone = guestPhone.trim()
    const contactEmail = guestEmail.trim()

    if (!serviceAddress.trim()) {
      setSubmitMessage("Please enter where we should meet you (service address).")
      return
    }

    if (!contactName || !contactPhone || !contactEmail) {
      setSubmitMessage("Please enter your name, phone, and email.")
      return
    }

    if (isSlotTaken(bookings, selection.operatorId, dateKey, selection.slotId)) {
      setSubmitMessage("That slot was just taken—please pick another time.")
      setBookingRefresh((v) => v + 1)
      setSelection(null)
      return
    }

    const record: BookingRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      operatorId: selection.operatorId,
      dateKey,
      slotId: selection.slotId,
      services,
      vehicleSize,
      estimatedTotal: priceBreakdown.total,
      pricingNote: priceBreakdown.note,
      lineItems:
        priceBreakdown.lines.length > 0
          ? priceBreakdown.lines.map((l) => ({ label: l.label, amount: l.amount }))
          : undefined,
      serviceAddress: serviceAddress.trim(),
      contactName,
      contactPhone,
      contactEmail,
    }
    let emailSent = false
    let emailError: string | undefined
    try {
      const saveResult = await saveBooking(record)
      emailSent = saveResult.emailSent
      emailError = saveResult.emailError
    } catch (error) {
      if (error instanceof Error && error.message === "SLOT_TAKEN") {
        setSubmitMessage("That slot was just taken—please pick another time.")
        setBookingRefresh((v) => v + 1)
        setSelection(null)
        return
      }
      setSubmitMessage("We could not save your booking right now. Please try again.")
      return
    }

    if (emailError === "missing_bookings_api_url") {
      setSubmitMessage(
        "Online booking is not connected to the server yet. Please WhatsApp or call us to book, or try again later.",
      )
      return
    }

    setBookings((prev) => [...prev, record])
    let emailNote = emailSent
      ? " We have also sent a confirmation email."
      : " If you do not receive the confirmation email check your spam folder."
    if (!emailSent && emailError === "offline_local_storage") {
      emailNote =
        " We could not reach the booking server—your visit is saved only on this device. Please message us on WhatsApp or call to confirm."
    } else if (!emailSent && emailError && emailError !== "offline_local_storage") {
      emailNote =
        " Your booking was saved, but we could not send email from the server. We will still follow up—check spam or contact us if you hear nothing."
    }
    setSubmitMessage(
      `Booking confirmed for ${formatDisplayDate(selectedDate)} at ${TIME_SLOTS.find((s) => s.id === selection.slotId)?.label}. We will contact you at ${contactEmail}.${emailNote}`,
    )
    setSelection(null)
    setSelInterior(false)
    setSelExterior(false)
    setSelWashVacuum(false)
    setSelFullDetail(false)
    setAddonSel(emptyAddonSelection())
    setGuestName("")
    setGuestPhone("")
    setGuestEmail("")
    setServiceAddress("")
    setBookingRefresh((v) => v + 1)
  }

  return (
    <section className="section booking-section" id="booking" aria-labelledby="booking-heading">
      <div className="section-head">
        <h2 id="booking-heading">Book a visit</h2>
        <p className="muted">
          We come to <strong>your</strong> home, workplace, or business—pick a day, operator, and time,
          then tell us where to meet you. You can also{" "}
          <a href={whatsAppHref()} target="_blank" rel="noopener noreferrer">
            message us on WhatsApp
          </a>{" "}
          with your location pin.
        </p>
      </div>

      <form className="card booking-main" onSubmit={handleBook}>
          <h3 className="booking-step-title">Pick a date</h3>
          <div className="date-strip" role="listbox" aria-label="Select date">
            {dateStrip.map((d) => {
              const key = toDateKey(d)
              const active = key === dateKey
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`date-pill ${active ? "active" : ""}`}
                  onClick={() => {
                    setSelectedDate(d)
                    setSelection(null)
                  }}
                >
                  <span className="dow">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  <span className="dom">{d.getDate()}</span>
                  <span className="mon">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                </button>
              )
            })}
          </div>
          <p className="muted small">
            Selected: <strong>{formatDisplayDate(selectedDate)}</strong> · Open 7 days a week.
          </p>

          <h3 className="booking-step-title">Choose operator &amp; time</h3>
          <div className="operators-grid">
            {operators.map((op) => (
              <div key={op.id} className="operator-column">
                <div className="operator-head">
                  <h4>{op.name}</h4>
                </div>
                <ul className="slot-list">
                  {visibleSlots.map((slot) => {
                    const taken = isSlotTaken(bookings, op.id, dateKey, slot.id)
                    const isSelected =
                      selection?.operatorId === op.id && selection.slotId === slot.id
                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          disabled={taken}
                          className={`slot-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelection({ operatorId: op.id, slotId: slot.id })}
                        >
                          <span>{slot.label}</span>
                          <span className={`slot-status ${taken ? "is-booked" : "is-available"}`}>
                            {taken ? (
                              <>
                                <span className="slot-dot slot-dot-booked" aria-hidden />
                                <span>Booked</span>
                              </>
                            ) : (
                              <>
                                <span className="slot-dot slot-dot-available" aria-hidden />
                                <span className="sr-only">Available</span>
                              </>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          {visibleSlots.length === 0 ? (
            <p className="muted small">No remaining slots for this date. Please choose another day.</p>
          ) : null}
<br />
          <h3 className="booking-step-title">Vehicle size</h3>
          <p className="muted small">Pricing is based on vehicle size</p>
          <div className="vehicle-row vehicle-row-first">
            <div className="segmented vehicle-segmented" role="group" aria-label="Vehicle size">
              {(["small", "medium", "large"] as const).map((vs) => (
                <button
                  key={vs}
                  type="button"
                  className={vehicleSize === vs ? "active" : ""}
                  onClick={() => setVehicleSize(vs)}
                >
                  {vehicleSizeLabels[vs]}
                </button>
              ))}
            </div>
          </div>

          <h3 className="booking-step-title">Service &amp; add-ons</h3>
          <p className="muted small">Select your services.</p>
          <fieldset className="package-fieldset">
            <legend className="sr-only">Main services</legend>
            <div className="package-grid" role="group" aria-label="Wash and detailing packages">
              <label
                className={`package-tile ${selInterior ? "is-selected" : ""}`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={selInterior}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSelInterior(on)
                    if (on) {
                      setSelWashVacuum(false)
                      setSelFullDetail(false)
                    }
                  }}
                />
                <span className="package-tile-copy">
                  <span className="package-tile-title">Interior deal</span>
                  <span className="package-tile-hint">Cabin clean &amp; vacuum</span>
                </span>
                <span className="package-tile-price">{formatKyd(unitPrices.interior)}</span>
              </label>
              <label
                className={`package-tile ${selExterior ? "is-selected" : ""}`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={selExterior}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSelExterior(on)
                    if (on) {
                      setSelWashVacuum(false)
                      setSelFullDetail(false)
                    }
                  }}
                />
                <span className="package-tile-copy">
                  <span className="package-tile-title">Exterior deal</span>
                  <span className="package-tile-hint">Hand wash &amp; shine</span>
                </span>
                <span className="package-tile-price">{formatKyd(unitPrices.exterior)}</span>
              </label>
              <label
                className={`package-tile ${selWashVacuum ? "is-selected" : ""}`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={selWashVacuum}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSelWashVacuum(on)
                    if (on) {
                      setSelInterior(false)
                      setSelExterior(false)
                      setSelFullDetail(false)
                    }
                  }}
                />
                <span className="package-tile-copy">
                  <span className="package-tile-title">Wash &amp; vacuum</span>
                  <span className="package-tile-hint">Quick inside &amp; out</span>
                </span>
                <span className="package-tile-price">{formatKyd(unitPrices.washVacuum)}</span>
              </label>
              <label
                className={`package-tile ${selFullDetail ? "is-selected" : ""}`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={selFullDetail}
                  onChange={(e) => {
                    const on = e.target.checked
                    setSelFullDetail(on)
                    if (on) {
                      setSelInterior(false)
                      setSelExterior(false)
                      setSelWashVacuum(false)
                      setAddonSel(emptyAddonSelection())
                    }
                  }}
                />
                <span className="package-tile-copy">
                  <span className="package-tile-title">Full detailing</span>
                  <span className="package-tile-hint">Deep clean — final price quoted on site</span>
                </span>
                <span className="package-tile-price package-tile-price-range">$100–$350</span>
              </label>
            </div>
          </fieldset>

          <div className="addon-toggles-stack" role="group" aria-label="Optional add-ons">
            <p className="muted small addon-toggles-lead">
              Optional add-ons — priced for your vehicle size. Select a main package above first.
            </p>
            {addonBookingOptions.map((opt) => (
              <label
                key={opt.key}
                className={`wax-toggle ${!addonsAllowed ? "is-disabled" : ""}`}
              >
                <input
                  className="wax-checkbox"
                  type="checkbox"
                  checked={addonsAllowed && addonSel[opt.key]}
                  disabled={!addonsAllowed}
                  onChange={(e) =>
                    setAddonSel((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                  }
                />
                <span className="wax-toggle-text">
                  <span className="wax-toggle-row">
                    <strong>{opt.label}</strong>
                    <span className="wax-toggle-price">
                      + {formatKyd(unitPrices[opt.key])}
                    </span>
                  </span>
                  <span className="muted tiny">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="quote-box" aria-live="polite">
            <p className="quote-box-title">Your estimate</p>
            {!hasServiceSelection ? (
              <p className="muted">Select services above to see line items and total.</p>
            ) : selFullDetail ? (
              <p>
                <strong>Full detailing</strong> — {priceBreakdown.note}
              </p>
            ) : priceBreakdown.total !== null && priceBreakdown.lines.length > 0 ? (
              <>
                <ul className="price-lines">
                  {priceBreakdown.lines.map((line, i) => (
                    <li key={`${line.label}-${i}`} className="price-line">
                      <span>{line.label}</span>
                      <span>${line.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="price-total">
                  <span>Estimated total</span>
                  <strong>${priceBreakdown.total.toFixed(2)} KYD</strong>
                </p>
              </>
            ) : (
              <p className="muted">{priceBreakdown.note ?? "Adjust your selections to see pricing."}</p>
            )}
          </div>

          <h3 className="booking-step-title">Service location</h3>
          <p className="muted small">
            Where should the mobile unit meet you? (Home, office, business address, or lot—be specific.)
          </p>
          <label>
            <span className="sr-only">Service address</span>
            <textarea
              value={serviceAddress}
              onChange={(e) => setServiceAddress(e.target.value)}
              required
              rows={3}
              autoComplete="street-address"
              placeholder="Service address — e.g. 18 Fair Lawn Rd, George Town — or your workplace name and area"
            />
          </label>
          <br />
          <h3 className="booking-step-title">Your contact</h3>
          <p className="muted small guest-contact-lead">
            We’ll confirm your visit and reach you if your time slot changes.
          </p>
          <div className="guest-contact-grid">
            <label className="guest-field guest-field-full">
              <span className="guest-field-label">Full name</span>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                name="contact-name"
                autoComplete="name"
                placeholder="e.g. Jane Smith"
              />
            </label>
            <label className="guest-field">
              <span className="guest-field-label">Mobile</span>
              <input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
                name="contact-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. 345-123-4567"
              />
            </label>
            <label className="guest-field">
              <span className="guest-field-label">Email</span>
              <input
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                name="contact-email"
                type="email"
                autoComplete="email"
                placeholder="sam@samsmobile.ky"
              />
            </label>
          </div>

          <div className="booking-actions">
            <button type="submit" className="btn primary wide btn-stack">
              <span className="btn-stack-primary">Confirm booking</span>
              <span className="btn-stack-sub">We’ll follow up by email with your appointment details</span>
            </button>
            {submitMessage && <p className="form-success">{submitMessage}</p>}
          </div>
      </form>
    </section>
  )
}
