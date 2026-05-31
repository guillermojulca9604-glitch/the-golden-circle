"use client"

import Image from "next/image"
import { useRef, useState } from "react"

interface CatalogItem {
  id: number
  type: "image" | "video"
  thumbnail: string
  videoUrl?: string
  orientation?: "vertical" | "horizontal"
  title: string
  description: string
}

const catalogItems: CatalogItem[] = [
  {
    id: 1,
    type: "image",
    thumbnail: "/photo_2026-05-17_12-49-24.jpg",
    title: "Colección Exclusiva",
    description: "Contenido premium disponible para miembros",
  },
  {
    id: 2,
    type: "video",
    thumbnail: "/photo_2026-05-17_12-53-50.jpg",
    videoUrl: "/IMG_9791.MP4",
    title: "Preview Especial",
    description: "Adelanto exclusivo de nuevo contenido",
  },
  {
    id: 3,
    type: "image",
    thumbnail: "/photo_2026-05-17_12-53-57.jpg",
    title: "Galería Premium",
    description: "Acceso a galería completa vía Telegram",
  },
  {
    id: 4,
    type: "image",
    thumbnail: "/photo_2026-05-17_13-03-48.jpg",
    title: "Colección Especial",
    description: "Contenido de edición limitada",
  },
  {
    id: 5,
    type: "video",
    thumbnail: "/signal-2026-02-03-094246.jpeg",
    videoUrl: "/IMG_9816.MP4",
    orientation: "vertical",
    title: "Detrás de Escenas",
    description: "Material exclusivo del proceso creativo",
  },
  {
    id: 6,
    type: "image",
    thumbnail: "/photo_2026-05-17_12-53-50.jpg",
    title: "Novedades",
    description: "Lo más reciente de la colección",
  },
]

function CatalogCard({ item }: { item: CatalogItem }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVertical, setIsVertical] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const bgVideoRef = useRef<HTMLVideoElement>(null)

  const isVideoVertical = item.orientation === "vertical" || isVertical

  const handleVideoToggle = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.muted = true

      video.load()

      bgVideoRef.current?.load()

      video.play().then(() => {
        setIsPlaying(true)
        bgVideoRef.current?.play().catch(() => {})
      }).catch(() => {})
    } else {
      video.pause()
      bgVideoRef.current?.pause()
      setIsPlaying(false)
    }
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setIsVertical(videoRef.current.videoHeight > videoRef.current.videoWidth)
  }

  return (
    <article
      className="group glass-card relative overflow-hidden rounded-2xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-black">
        {item.type === "video" && item.videoUrl && (
          <div
            className={`absolute inset-0 overflow-hidden rounded-2xl bg-black transition-opacity duration-300 ${
              isPlaying ? "z-10 opacity-100" : "opacity-0"
            }`}
          >
            {isVideoVertical && (
              <video
                ref={bgVideoRef}
                src={item.videoUrl}
                className="video-mirror absolute inset-0 h-full w-full scale-150 rounded-2xl object-cover opacity-60"
                playsInline
                muted
                loop
                preload="auto"
              />
            )}

            <video
              ref={videoRef}
              src={item.videoUrl}
              className={`absolute inset-0 z-10 h-full w-full rounded-2xl ${
                isVideoVertical ? "object-contain" : "object-cover"
              }`}
              playsInline
              muted
              loop
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              onPause={() => {
                setIsPlaying(false)
                bgVideoRef.current?.pause()
              }}
              onEnded={() => {
                setIsPlaying(false)
                bgVideoRef.current?.pause()
              }}
            />
          </div>
        )}

        <Image
          src={item.thumbnail}
          alt={item.title}
          fill
          quality={100}
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={`rounded-2xl object-cover transition-transform duration-500 ease-out ${
            isHovered ? "scale-105" : "scale-100"
          } ${isPlaying ? "opacity-0" : "opacity-100"}`}
        />

        <div
          className={`absolute inset-0 rounded-2xl bg-linear-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300 ${
            isPlaying ? "opacity-0" : "opacity-100"
          }`}
        />

        {item.type === "video" && (
          <button
            type="button"
            aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
            onClick={handleVideoToggle}
            className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-300 ${
              isPlaying
                ? "opacity-0 hover:opacity-100"
                : isHovered
                  ? "opacity-100"
                  : "opacity-80"
            }`}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/35 bg-black/20 transition-transform duration-300 group-hover:scale-105">
              <span className="ml-1 text-3xl text-gold">
                {isPlaying ? "Ⅱ" : "▷"}
              </span>
            </div>
          </button>
        )}

        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl border transition-all duration-300 ${
            isHovered
              ? "border-gold/30 shadow-[inset_0_0_35px_rgba(212,175,55,0.08)]"
              : "border-gold/10"
          }`}
        />
      </div>

      <div className="p-5">
        <h3 className="mb-2 text-lg font-medium tracking-wide text-foreground transition-colors duration-300 group-hover:text-gold">
          {item.title}
        </h3>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>

      <div className="absolute right-4 top-4">
        <div
          className={`h-2 w-2 rounded-full bg-gold/50 transition-all duration-300 ${
            isHovered
              ? "bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              : ""
          }`}
        />
      </div>
    </article>
  )
}

export function CatalogSection() {
  return (
    <section id="catalogo" className="relative px-6 py-20 md:py-32">
      <div className="mx-auto mb-16 max-w-7xl text-center">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold">
          Catálogo
        </span>

        <h2 className="mb-6 text-3xl font-light tracking-wide text-foreground md:text-4xl lg:text-5xl">
          Contenido Exclusivo
        </h2>

        <div className="gold-line" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {catalogItems.map((item, index) => (
          <div
            key={item.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CatalogCard item={item} />
          </div>
        ))}
      </div>
    </section>
  )
}