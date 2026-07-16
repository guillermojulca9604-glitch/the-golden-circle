import { CatalogSection } from "@/components/catalog-section"
import { ContactSection } from "@/components/contact-section"
import { FeaturedSection } from "@/components/featured-section"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/hero-section"
import { HomeHistoryController } from "@/components/home-history-controller"
import { EntryGate } from "@/components/legal/entry-gate"

export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-background text-foreground">
      <HomeHistoryController />

      <EntryGate />

      <HeroSection />

      <CatalogSection />

      <FeaturedSection />

      <ContactSection />

      <Footer />
    </main>
  )
}