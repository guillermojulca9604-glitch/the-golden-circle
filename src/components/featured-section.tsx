
import Image from "next/image"
import Link from "next/link"
import { Source_Serif_4 } from "next/font/google"

import styles from "./featured-section.module.css"

const numberFont =
  Source_Serif_4({
    subsets: ["latin"],
    weight: "300",
    display: "swap",
  })

const featuredContent = {
  badge: "Nuevo",
  title: "Anuncio Importante",
  description:
    "Contenido exclusivo disponible para los miembros de The Golden Circle. Accede a las últimas actualizaciones y material premium.",
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
    <section className="relative overflow-hidden px-6 pt-8 pb-20 md:pt-12 md:pb-32 max-md:px-4 max-md:pt-6 max-md:pb-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center max-md:mb-8">
          <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold max-md:mb-3">
            Destacado
          </span>

          <h2 className="mb-6 text-3xl font-light tracking-wide text-foreground md:text-4xl lg:text-5xl max-md:mb-4 max-md:text-[1.65rem]">
            Lo Último
          </h2>

          <div className="gold-line" />
        </div>

        <div className="featured-card relative overflow-hidden rounded-3xl">
          <div className="grid overflow-hidden md:grid-cols-2">
            <div className="relative min-h-105 overflow-hidden max-md:min-h-[clamp(220px,62vw,280px)]">
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

              <div className="absolute left-6 top-6 max-md:left-4 max-md:top-4">
                <div className="flex items-center gap-2 rounded-full border border-gold/30 bg-black/35 px-4 py-2 max-md:px-3 max-md:py-1.5">
                  <span className="text-gold">
                    ✦
                  </span>

                  <span className="text-xs uppercase tracking-wider text-gold">
                    {featuredContent.badge}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-8 md:p-12 max-md:p-5">
              <div
                className={`${numberFont.className} mb-4 flex items-baseline text-gold/75 max-md:mb-3`}
              >
                <span className="text-[0.84rem] font-light uppercase leading-none tracking-[0.14em] max-md:text-xs">
                  Novedades
                </span>

                <span className="mx-2.5 text-[0.72rem] font-light leading-none text-gold/30">
                  ·
                </span>

                <span
                  className="text-[0.84rem] font-light leading-none tracking-[0.06em] max-md:text-xs"
                  style={{
                    fontVariantNumeric:
                      "lining-nums tabular-nums",
                  }}
                >
                  2026
                </span>
              </div>

              <h3 className="mb-6 text-2xl font-light tracking-wide text-foreground md:text-4xl max-md:mb-4 max-md:text-[1.4rem]">
                {featuredContent.title}
              </h3>

              <p className="mb-8 leading-relaxed text-muted-foreground max-md:mb-5 max-md:text-sm">
                {featuredContent.description}
              </p>

              <div className="flex w-fit flex-col items-start">
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
                    className={`${styles.subscriptionLink} telegram-button subscription-premium-button inline-flex cursor-pointer items-center gap-3 rounded-2xl px-8 py-5 text-sm uppercase tracking-[0.28em] max-md:gap-2 max-md:px-5 max-md:py-3.5 max-md:text-xs max-md:tracking-[0.18em]`}
                  >
                    Suscripción

                    <span className="telegram-arrow text-lg max-md:text-base">
                      →
                    </span>
                  </Link>
                </span>

                <div
                  className={`${numberFont.className} mt-5 flex items-baseline gap-2 max-md:mt-4`}
                  style={{
                    fontVariantNumeric:
                      "lining-nums tabular-nums",
                  }}
                  aria-label="+1.5 mil suscriptores"
                >
                  <span className="text-lg font-light leading-none tracking-[-0.015em] text-gold/85 max-md:text-base">
                    +1.5 mil
                  </span>

                  <span className="text-sm font-light leading-none tracking-[0.02em] text-muted-foreground max-md:text-xs">
                    suscriptores
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
