import { useMemo, useState, type FormEvent } from "react"
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
import { isSlotTaken, saveBooking, type BookingRecord } from "../lib/bookingStore"
import {
  formatDisplayDate,
  getBookableDates,
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
  const [, setBookingRefresh] = useState(0)

  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate])
  const dateStrip = useMemo(() => getBookableDates(new Date(), 28), [])

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

  const canSubmit =
    selection &&
    hasServiceSelection &&
    (priceBreakdown.total !== null || selFullDetail) &&
    serviceAddress.trim().length > 0 &&
    guestName.trim() &&
    guestPhone.trim() &&
    guestEmail.trim()

  function handleBook(e: FormEvent) {
    e.preventDefault()
    setSubmitMessage(null)
    if (!selection || !hasServiceSelection) return

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

    if (isSlotTaken(selection.operatorId, dateKey, selection.slotId)) {
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
      serviceAddress: serviceAddress.trim(),
      contactName,
      contactPhone,
      contactEmail,
    }
    saveBooking(record)
    setSubmitMessage(
      `Booking confirmed for ${formatDisplayDate(selectedDate)}, ${TIME_SLOTS.find((s) => s.id === selection.slotId)?.label}, at your service location. We will contact you at ${contactEmail}.`,
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
                  <span className="muted tiny">Mobile unit</span>
                </div>
                <ul className="slot-list">
                  {TIME_SLOTS.map((slot) => {
                    const taken = isSlotTaken(op.id, dateKey, slot.id)
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
                <span className="package-tile-price package-tile-price-range">$100–$350 KYD</span>
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
                placeholder="name@example.com"
              />
            </label>
          </div>

          <div className="booking-actions">
            <button type="submit" className="btn primary wide btn-stack" disabled={!canSubmit}>
              <span className="btn-stack-primary">Confirm booking</span>
              <span className="btn-stack-sub">We’ll follow up by email with your appointment details</span>
            </button>
            {submitMessage && <p className="form-success">{submitMessage}</p>}
          </div>
      </form>
    </section>
  )
}
