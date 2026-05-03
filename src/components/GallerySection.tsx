import { galleryPhotos } from "../data/brandAssets"

export function GallerySection() {
  return (
    <section className="section" id="gallery" aria-labelledby="gallery-heading">
      <div className="section-head">
        <h2 id="gallery-heading">Pictures</h2>
        <p className="muted">A few snapshots from recent mobile wash and detailing work.</p>
      </div>
      <div className="gallery-grid">
        {galleryPhotos.map((photo) => (
          <figure key={photo.src} className="gallery-item">
            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  )
}
