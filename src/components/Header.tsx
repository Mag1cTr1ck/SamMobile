import { useEffect, useState } from "react"
import { brandLogos } from "../data/brandAssets"
import { company } from "../data/siteContent"

const links = [
  { href: "#booking", label: "Book" },
  { href: "#services", label: "Services" },
  { href: "#team", label: "Team" },
  { href: "#vehicles", label: "Vehicle sizes" },
  { href: "#gallery", label: "Pictures" },
  { href: "#contact", label: "Contact" },
] as const

const SECTION_IDS = links.map((l) => l.href.slice(1))

export function Header() {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headerEl = document.querySelector(".site-header")
    const offset = () =>
      (headerEl instanceof HTMLElement ? headerEl.offsetHeight : 72) + 12

    const updateActive = () => {
      const y = window.scrollY + offset()
      let current = ""
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.offsetTop <= y) current = id
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }

    updateActive()
    const rafId = requestAnimationFrame(updateActive)

    window.addEventListener("scroll", updateActive, { passive: true })
    window.addEventListener("resize", updateActive)
    window.addEventListener("hashchange", updateActive)

    const t = window.setTimeout(updateActive, 150)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(t)
      window.removeEventListener("scroll", updateActive)
      window.removeEventListener("resize", updateActive)
      window.removeEventListener("hashchange", updateActive)
    }
  }, [])

  return (
    <header className="site-header">
      <a className="brand" href="#top">
        <img
          className="brand-logo"
          src={brandLogos.clean}
          width={440}
          height={123}
          alt=""
          decoding="async"
        />
        <span className="sr-only">
          {company.businessName} — {company.legalName}
        </span>
      </a>
      <nav className="nav" aria-label="Primary">
        {links.map((l) => {
          const id = l.href.slice(1)
          const isActive = activeId === id
          return (
            <a
              key={l.href}
              href={l.href}
              className={isActive ? "is-active" : undefined}
              aria-current={isActive ? "location" : undefined}
            >
              {l.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
