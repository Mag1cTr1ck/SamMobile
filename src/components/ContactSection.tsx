import { company, whatsAppHref } from "../data/siteContent"

export function ContactSection() {
  return (
    <section className="section" id="contact" aria-labelledby="contact-heading">
      <div className="section-head">
        <h2 id="contact-heading">Contact &amp; locations</h2>
        <p className="muted">
          <strong>Service:</strong> we meet you where your vehicle is—home, office, or other workplace.
          <br />
          <strong>Office:</strong> below is our business address for mail and correspondence (not where
          washes are performed).
        </p>
      </div>
      <div className="contact-grid contact-grid-3">
        <div className="card contact-card">
          <h3>Mobile service &amp; WhatsApp</h3>
          <p>
            Message us on WhatsApp to book or send your <strong>service location</strong> (address or
            drop a location pin in the chat—works great for finding you on site).
          </p>
          <div className="contact-actions">
            <a
              className="btn primary"
              href={whatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp {company.cell}
            </a>
          </div>
          <p className="muted tiny">
            Google Maps below shows our <em>office</em> only. For the wash, use WhatsApp or the address
            fields when you book online.
          </p>
        </div>
        <div className="card contact-card">
          <h3>Office &amp; mailing address</h3>
          <address className="contact-address">
            {company.businessName}
            <br />
            {company.legalName}
            <br />
            {company.address}
            <br />
            {company.poBox}
          </address>
          <a
            className="btn ghost map-link"
            href={company.officeMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open office in Google Maps
          </a>
        </div>
        <div className="card contact-card">
          <h3>Phone &amp; email</h3>
          <p>
            Land line:{" "}
            <a href={`tel:+1345${company.landLine.replace(/-/g, "")}`}>{company.landLine}</a>
            <br />
            Cell:{" "}
            <a href={`tel:+1345${company.cell.replace(/-/g, "")}`}>{company.cell}</a>
          </p>
          <p>
            <a href={`mailto:${company.email}`}>{company.email}</a>
          </p>
        </div>
      </div>
    </section>
  )
}
