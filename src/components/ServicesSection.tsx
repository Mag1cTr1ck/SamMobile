import { addonBookingOptions, dealDetails, priceTable } from "../data/siteContent"
import { formatKyd } from "../lib/pricing"

function addonLeadPrice(key: (typeof addonBookingOptions)[number]["key"]): string {
  const row = priceTable.rows.find((r) => r.key === key)
  const n = row?.values[0] ?? 0
  return formatKyd(n)
}

export function ServicesSection() {
  return (
    <section className="section" id="services" aria-labelledby="services-heading">
      <div className="section-head">
        <h2 id="services-heading">What we offer</h2>
        <p className="muted">
          Clear packages with honest scope—choose what fits your vehicle and schedule.
        </p>
      </div>

      <div className="grid cards-2">
        <article className="card">
          <h3>{dealDetails.interior.title}</h3>
          <p className="muted small">Focused on the cabin.</p>
          <h4 className="list-title">Typically includes</h4>
          <ul className="checklist">
            {dealDetails.interior.included.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>{dealDetails.exterior.title}</h3>
          <p className="muted small">Focused on the outside.</p>
          <h4 className="list-title">Typically includes</h4>
          <ul className="checklist">
            {dealDetails.exterior.included.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>{dealDetails.washVacuum.title}</h3>
          <p className="muted small">Exterior wash plus a light interior vacuum.</p>
          <h4 className="list-title">Exterior</h4>
          <ul className="checklist">
            {dealDetails.washVacuum.exterior.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4 className="list-title">Interior</h4>
          <ul className="checklist">
            {dealDetails.washVacuum.interior.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>{dealDetails.fullDetail.title}</h3>
          <p className="muted small">Top-to-bottom refresh—priced after vehicle review.</p>
          <h4 className="list-title">Exterior full detailing</h4>
          <ul className="checklist">
            {dealDetails.fullDetail.exterior.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4 className="list-title">Interior full detailing</h4>
          <ul className="checklist">
            {dealDetails.fullDetail.interior.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </article>

        <article className="card services-addons-card">
          <h3>Optional add-ons</h3>
          <p className="muted small">
            Book these with a main package — final price depends on vehicle size (small / medium / large).
            Small-vehicle starting prices:
          </p>
          <ul className="addon-services-list">
            {addonBookingOptions.map((opt) => (
              <li key={opt.key}>
                <span className="addon-services-label">{opt.label}</span>
                <span className="addon-services-meta">
                  <span className="addon-services-price">from {addonLeadPrice(opt.key)}</span>
                  <span className="muted tiny addon-services-hint">{opt.hint}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small services-addons-book">
            Use the booking form below to build an estimate for your vehicle size.
          </p>
        </article>
      </div>
    </section>
  )
}
