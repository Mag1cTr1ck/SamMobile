import { vehicleExamples, type VehicleSize } from "../data/siteContent"

const order: VehicleSize[] = ["small", "medium", "large"]

export function VehicleSizesSection() {
  return (
    <section className="section muted-band" id="vehicles" aria-labelledby="vehicles-heading">
      <div className="section-head">
        <h2 id="vehicles-heading">Vehicle sizes</h2>
        <p className="muted">
          We classify vehicles so pricing matches time on site—if you are unsure, pick the closest
          match and we will confirm on arrival.
        </p>
      </div>
      <div className="vehicle-grid">
        {order.map((key) => {
          const block = vehicleExamples[key]
          return (
            <article key={key} className="card vehicle-card">
              <h3>{block.title}</h3>
              <ul className="definition-list">
                {block.definition.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
