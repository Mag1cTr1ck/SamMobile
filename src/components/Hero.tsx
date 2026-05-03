import { brandLogos } from "../data/brandAssets"

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <p className="eyebrow">We come to you · Grand Cayman</p>
        <h1 id="hero-heading">For all your car cleaning needs.</h1>
        <p className="lede">
          Our mobile operators travel to <strong>your</strong> home, workplace, or business—we bring
          the equipment and the shine to you. We have been in business for <strong>20 years</strong>, so
          you get an experienced team that knows how to work around your schedule. Book a time, share your
          location, and we handle the rest.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="#booking">
            Book a slot
          </a>
          <a className="btn accent" href="#services">
            View services
          </a>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-logo-wrap">
          <img
            className="hero-logo"
            src={brandLogos.yellowBg}
            width={480}
            height={360}
            alt="Sam's Mobile Cleaning Services — technician washing a vehicle"
            decoding="async"
          />
        </div>
      </div>
    </section>
  )
}
