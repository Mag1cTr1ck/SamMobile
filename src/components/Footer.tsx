import { brandLogos } from "../data/brandAssets"
import { company } from "../data/siteContent"

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <img
          className="footer-logo"
          src={brandLogos.clean}
          width={180}
          height={50}
          alt=""
          decoding="async"
        />
        <p>
          © {new Date().getFullYear()} {company.legalName}. {company.businessName}.
        </p>
        <p className="muted small">Payment: cash or bank transfer.</p>
      </div>
    </footer>
  )
}
