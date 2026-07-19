import Image from "next/image"
import Link from "next/link"

import styles from "./featured-section.module.css"

const featuredContent = {
  badge: "Nuevo",
  title: "Anuncio Importante",
  subtitle: "Novedades de Mayo 2026",
  description:
    "Contenido exclusivo disponible para los miembros de The Golden Circle. Accede a las últimas actualizaciones y material premium a través de nuestro canal oficial de Telegram.",
  image:
    "/photo_2026-05-17_13-03-48.jpg",

  /*
   * Cambia únicamente este número
   * para graduar el blur de la imagen.
   */
  imageBlur: 9,
}

export function FeaturedSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-20 md:pt-12 md:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold">
            Destacado
          </span>

          <h2 className="mb-6 text-3xl font-light tracking-wide text-foreground md:text-4xl lg:text-5xl">
            Lo Último
          </h2>

          <div className="gold-line" />
        </div>

        <div className="featured-card relative overflow-hidden rounded-3xl">
          <div className="grid overflow-hidden md:grid-cols-2">
            <div className="relative min-h-105 overflow-hidden">
              <Image
                src={featuredContent.image}
                alt={featuredContent.title}
                fill
                quality={100}
                priority
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                style={{
                  filter:
                    `blur(${featuredContent.imageBlur}px)`,
                }}
              />

              <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-background/85" />

              <div className="absolute left-6 top-6">
                <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-black/35 px-4 py-2">
                  <span className="text-gold">
                    ✦
                  </span>

                  <span className="text-xs uppercase tracking-wider text-gold">
                    {featuredContent.badge}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-8 md:p-12">
              <span className="mb-4 text-xs uppercase tracking-[0.35em] text-gold/70">
                {featuredContent.subtitle}
              </span>

              <h3 className="mb-6 text-2xl font-light tracking-wide text-foreground md:text-4xl">
                {featuredContent.title}
              </h3>

              <p className="mb-8 leading-relaxed text-muted-foreground">
                {featuredContent.description}
              </p>

              <span className={styles.subscriptionOrbit}>
                <span
                  className={styles.subscriptionBorderFlow}
                  aria-hidden="true"
                >
                  <span
                    className={`${styles.subscriptionLight} ${styles.subscriptionLightFirst}`}
                  />

                  <span
                    className={`${styles.subscriptionLight} ${styles.subscriptionLightSecond}`}
                  />
                </span>

                <Link
                  href="/suscripcion"
                  className={`${styles.subscriptionLink} telegram-button subscription-premium-button inline-flex cursor-pointer items-center gap-3 rounded-2xl px-8 py-5 text-sm uppercase tracking-[0.28em]`}
                >
                  Suscripción

                  <span className="telegram-arrow text-lg">
                    →
                  </span>
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}