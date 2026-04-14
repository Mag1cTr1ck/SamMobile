import { Header } from "./components/Header"
import { Hero } from "./components/Hero"
import { ServicesSection } from "./components/ServicesSection"
import { TeamSection } from "./components/TeamSection"
import { VehicleSizesSection } from "./components/VehicleSizesSection"
import { BookingSection } from "./components/BookingSection"
import { GallerySection } from "./components/GallerySection"
import { ContactSection } from "./components/ContactSection"
import { Footer } from "./components/Footer"

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <BookingSection />
        <ServicesSection />
        <TeamSection />
        <VehicleSizesSection />
        <GallerySection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
