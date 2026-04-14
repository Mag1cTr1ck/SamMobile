export function GallerySection() {
  return (
    <section className="section" id="gallery" aria-labelledby="gallery-heading">
      <div className="section-head">
        <h2 id="gallery-heading">Pictures</h2>
        <p className="muted">
          A few snapshots from recent jobs—replace these placeholders with your own photos anytime.
        </p>
      </div>
      <div className="gallery-grid">
        {[1, 2, 3].map((n) => (
          <div key={n} className="gallery-placeholder">
            <span>Add image {n}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
