import { operators } from "../data/siteContent"

export function TeamSection() {
  return (
    <section className="section" id="team" aria-labelledby="team-heading">
      <div className="section-head">
        <h2 id="team-heading">Our team</h2>
        <p className="muted">Two experienced washers on the road—same high standard every visit.</p>
      </div>
      <div className="grid cards-2">
        {operators.map((op) => (
          <article key={op.id} className="card team-card">
            <div className="avatar" aria-hidden>
              {op.name
                .split(" ")
                .map((p) => p[0])
                .join("")}
            </div>
            <h3>{op.name}</h3>
            <p className="role">{op.role}</p>
            <p className="bio">{op.bio}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
