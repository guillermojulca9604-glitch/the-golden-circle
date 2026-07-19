"use client"

import Image from "next/image"
import { useRef, useState } from "react"

interface CatalogItem {
  id: number
  type: "image" | "video"
  thumbnail?: string
  videoUrl?: string
  poster?: string
  orientation?: "vertical" | "horizontal"

  /*
   * Blur de la imagen o del poster.
   */
  imageBlur?: number

  /*
   * Blur exclusivo del video principal.
   * No modifica el espejo de relleno.
   */
  videoBlur?: number

  title: string
  description: string
}

type VideoWithFrameCallback =
  HTMLVideoElement & {
    requestVideoFrameCallback?: (
      callback: () => void
    ) => number
  }

const catalogItems: CatalogItem[] = [
  {
    id: 1,
    type: "image",
    thumbnail:
      "/Image 2026-05-10 at 1.26.49 PM.jpeg",
    imageBlur: 5,
    title: "Colección Exclusiva",
    description:
      "Contenido premium disponible para miembros",
  },
  {
    id: 2,
    type: "video",
    videoUrl: "/IMG_9791.MP4",
    poster: "/poster2.jpeg",
    orientation: "vertical",

    /*
     * Poster inicial.
     */
    imageBlur: 7,

    /*
     * Video cuando está reproduciéndose.
     */
    videoBlur: 7,

    title: "Preview Especial",
    description:
      "Adelanto exclusivo de nuevo contenido",
  },
  {
    id: 3,
    type: "image",
    thumbnail:
      "/signal-2026-02-03-094246.jpeg",
    imageBlur: 9,
    title: "Galería Premium",
    description:
      "Acceso a galería completa vía Telegram",
  },
  {
    id: 4,
    type: "image",
    thumbnail:
      "/photo_2026-05-17_12-53-50.jpg",
    imageBlur: 7,
    title: "Colección Especial",
    description:
      "Contenido de edición limitada",
  },
  {
    id: 5,
    type: "video",
    videoUrl: "/IMG_9816.MP4",
    poster: "/poster5.jpeg",
    orientation: "vertical",

    /*
     * Poster inicial.
     */
    imageBlur: 7,

    /*
     * Video cuando está reproduciéndose.
     */
    videoBlur: 7,

    title: "Detrás de Escenas",
    description:
      "Material exclusivo del proceso creativo",
  },
  {
    id: 6,
    type: "image",
    thumbnail:
      "/photo_2026-05-17_12-49-24.jpg",
    imageBlur: 9,
    title: "Novedades",
    description:
      "Lo más reciente de la colección",
  },
]

function CatalogCard({
  item,
}: {
  item: CatalogItem
}) {
  const [isPlaying, setIsPlaying] =
    useState(false)

  const [isStarting, setIsStarting] =
    useState(false)

  const [videoVisible, setVideoVisible] =
    useState(false)

  const [isVertical, setIsVertical] =
    useState(false)

  const videoRef =
    useRef<HTMLVideoElement>(null)

  const bgVideoRef =
    useRef<HTMLVideoElement>(null)

  /*
   * Indica si la intención actual
   * del usuario es reproducir.
   */
  const wantsToPlayRef =
    useRef(false)

  /*
   * Evita registrar varias esperas
   * para el mismo primer fotograma.
   */
  const frameRequestPendingRef =
    useRef(false)

  /*
   * Evita volver a ocultar el video
   * después de haberse mostrado.
   */
  const videoVisibleRef =
    useRef(false)

  const isVideoVertical =
    item.orientation === "vertical" ||
    isVertical

  const pauseBothVideos = () => {
    wantsToPlayRef.current = false
    frameRequestPendingRef.current = false

    videoRef.current?.pause()
    bgVideoRef.current?.pause()

    setIsStarting(false)
    setIsPlaying(false)
  }

  const revealVideo = () => {
    const video =
      videoRef.current

    frameRequestPendingRef.current =
      false

    /*
     * Si el usuario pausó antes de que
     * llegara el fotograma, mantenemos
     * el poster y no hacemos ningún cambio.
     */
    if (
      !video ||
      video.paused ||
      !wantsToPlayRef.current ||
      videoVisibleRef.current
    ) {
      return
    }

    videoVisibleRef.current = true
    setVideoVisible(true)
  }

  const revealVideoAfterFirstFrame = () => {
    const video =
      videoRef.current as
        | VideoWithFrameCallback
        | null

    if (
      !video ||
      videoVisibleRef.current ||
      frameRequestPendingRef.current
    ) {
      return
    }

    frameRequestPendingRef.current =
      true

    let finished = false

    const finish = () => {
      if (finished) return

      finished = true
      revealVideo()
    }

    /*
     * Confirma que el navegador
     * ya dibujó un fotograma real.
     */
    if (
      video.requestVideoFrameCallback
    ) {
      video.requestVideoFrameCallback(
        finish
      )
    }

    /*
     * Respaldo para navegadores
     * que no admitan esa función.
     */
    window.setTimeout(
      finish,
      220
    )
  }

  const startBackgroundVideo = () => {
    const mainVideo =
      videoRef.current

    const backgroundVideo =
      bgVideoRef.current

    if (
      !mainVideo ||
      !backgroundVideo ||
      !wantsToPlayRef.current
    ) {
      return
    }

    backgroundVideo.muted = true

    try {
      const difference =
        Math.abs(
          backgroundVideo.currentTime -
            mainVideo.currentTime
        )

      if (difference > 0.15) {
        backgroundVideo.currentTime =
          mainVideo.currentTime
      }
    } catch {
      /*
       * Conserva el tiempo disponible
       * si aún no puede sincronizar.
       */
    }

    backgroundVideo
      .play()
      .catch(() => {
        /*
         * El video principal puede
         * continuar aunque el espejo
         * tarde ligeramente.
         */
      })
  }

  const startVideo = async () => {
    const video =
      videoRef.current

    if (!video) return

    wantsToPlayRef.current = true
    setIsStarting(true)

    video.muted = true

    try {
      await video.play()

      /*
       * El usuario pudo pulsar Pausa
       * mientras play() seguía pendiente.
       */
      if (!wantsToPlayRef.current) {
        video.pause()
        bgVideoRef.current?.pause()

        setIsStarting(false)
        setIsPlaying(false)

        return
      }

      setIsStarting(false)
      setIsPlaying(true)

      startBackgroundVideo()
      revealVideoAfterFirstFrame()
    } catch {
      wantsToPlayRef.current = false

      setIsStarting(false)
      setIsPlaying(false)

      bgVideoRef.current?.pause()
    }
  }

  const handleVideoToggle = () => {
    const video =
      videoRef.current

    if (!video) return

    /*
     * También funciona mientras
     * el video está iniciando.
     */
    if (
      wantsToPlayRef.current ||
      isStarting ||
      isPlaying ||
      !video.paused
    ) {
      pauseBothVideos()
      return
    }

    void startVideo()
  }

  const handleLoadedMetadata = () => {
    const video =
      videoRef.current

    if (!video) return

    setIsVertical(
      video.videoHeight >
        video.videoWidth
    )
  }

  const handleVideoPlaying = () => {
    /*
     * Un evento atrasado no puede
     * reactivar un video pausado.
     */
    if (!wantsToPlayRef.current) {
      videoRef.current?.pause()
      bgVideoRef.current?.pause()

      setIsStarting(false)
      setIsPlaying(false)

      return
    }

    setIsStarting(false)
    setIsPlaying(true)

    startBackgroundVideo()
    revealVideoAfterFirstFrame()
  }

  const handleVideoPause = () => {
    setIsStarting(false)
    setIsPlaying(false)

    bgVideoRef.current?.pause()
  }

  const showPauseControl =
    isStarting || isPlaying

  return (
    <article
      className="relative isolate overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.115 0.012 85 / 0.96), oklch(0.075 0 0 / 0.98))",
        border:
          "1px solid oklch(0.78 0.12 85 / 0.28)",
        boxShadow:
          "0 0 0 1px oklch(0.78 0.12 85 / 0.025), 0 0 24px oklch(0.78 0.12 85 / 0.065), 0 14px 36px oklch(0 0 0 / 0.42), inset 0 1px 0 oklch(1 0 0 / 0.035)",
      }}
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-t-[15px] bg-black">
        {item.type === "video" &&
          item.videoUrl && (
            <>
              {/*
               * Video real.
               * Se muestra cuando existe
               * un fotograma preparado.
               */}
              <div
                className={`absolute inset-0 z-10 overflow-hidden rounded-t-[15px] bg-black transition-opacity duration-300 ease-out ${
                  videoVisible
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                {isVideoVertical && (
                  <video
                    ref={bgVideoRef}
                    src={item.videoUrl}
                    className="video-mirror absolute inset-0 h-full w-full scale-150 object-cover opacity-60"
                    playsInline
                    muted
                    loop
                    preload="auto"
                  />
                )}

                {/*
                 * Video principal.
                 * videoBlur se aplica aquí
                 * y no al espejo.
                 */}
                <video
                  ref={videoRef}
                  src={item.videoUrl}
                  className={`absolute inset-0 z-10 h-full w-full ${
                    isVideoVertical
                      ? "object-contain"
                      : "object-cover"
                  }`}
                  style={{
                    filter:
                      `blur(${item.videoBlur ?? 0}px)`,
                  }}
                  playsInline
                  muted
                  loop
                  preload="auto"
                  onLoadedMetadata={
                    handleLoadedMetadata
                  }
                  onPlaying={
                    handleVideoPlaying
                  }
                  onPause={
                    handleVideoPause
                  }
                  onEnded={() => {
                    pauseBothVideos()
                  }}
                />
              </div>

              {/*
               * Poster inicial.
               */}
              {item.poster && (
                <div
                  className={`absolute inset-0 z-20 overflow-hidden rounded-t-[15px] bg-black transition-opacity duration-300 ease-out ${
                    videoVisible
                      ? "pointer-events-none opacity-0"
                      : "opacity-100"
                  }`}
                >
                  {isVideoVertical && (
                    <>
                      {/*
                       * Espejo del poster.
                       * No utiliza imageBlur
                       * ni videoBlur.
                       */}
                      <Image
                        src={item.poster}
                        alt=""
                        fill
                        aria-hidden="true"
                        quality={100}
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="video-mirror scale-150 object-cover opacity-60"
                      />

                      <div className="absolute inset-0 bg-black/20" />
                    </>
                  )}

                  {/*
                   * Imagen principal
                   * del poster.
                   */}
                  <Image
                    src={item.poster}
                    alt={item.title}
                    fill
                    quality={100}
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className={
                      isVideoVertical
                        ? "object-contain"
                        : "object-cover"
                    }
                    style={{
                      filter:
                        `blur(${item.imageBlur ?? 0}px)`,
                    }}
                  />
                </div>
              )}
            </>
          )}

        {/*
         * Las cuatro imágenes normales.
         */}
        {item.type === "image" &&
          item.thumbnail && (
            <Image
              src={item.thumbnail}
              alt={item.title}
              fill
              quality={100}
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              style={{
                filter:
                  `blur(${item.imageBlur ?? 0}px)`,
              }}
            />
          )}

        <div
          className={`pointer-events-none absolute inset-0 z-20 bg-linear-to-t from-background/90 via-background/20 to-transparent transition-opacity duration-300 ${
            item.type === "video" &&
            isPlaying &&
            videoVisible
              ? "opacity-0"
              : "opacity-100"
          }`}
        />

        {item.type === "video" && (
          <button
            type="button"
            aria-label={
              showPauseControl
                ? "Pausar video"
                : "Reproducir video"
            }
            onClick={
              handleVideoToggle
            }
            className={`absolute inset-0 z-30 flex cursor-pointer items-center justify-center transition-opacity duration-300 ${
              isPlaying &&
              videoVisible
                ? "opacity-0 hover:opacity-100"
                : "opacity-100"
            }`}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/35 bg-black/35 shadow-[0_0_18px_rgba(212,175,55,0.08)] backdrop-blur-sm">
              <span
                className={
                  showPauseControl
                    ? "text-2xl text-gold"
                    : "ml-1 text-3xl text-gold"
                }
              >
                {showPauseControl
                  ? "Ⅱ"
                  : "▷"}
              </span>
            </div>
          </button>
        )}

        <div className="pointer-events-none absolute inset-0 z-40 rounded-t-[15px] ring-1 ring-inset ring-gold/10" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-px bg-gold/15" />
      </div>

      <div className="relative p-5">
        <h3 className="mb-2 text-lg font-medium tracking-wide text-foreground">
          {item.title}
        </h3>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>

      <div className="absolute right-4 top-4 z-50">
        <div className="h-1.5 w-1.5 rounded-full bg-gold/70 shadow-[0_0_8px_rgba(212,175,55,0.28)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-40 rounded-2xl ring-1 ring-inset ring-white/2.5" />
    </article>
  )
}

export function CatalogSection() {
  return (
    <section
      id="catalogo"
      className="relative px-6 py-20 md:py-32"
    >
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
        {catalogItems.map(
          (item, index) => (
            <div
              key={item.id}
              className="animate-fade-in-up"
              style={{
                animationDelay:
                  `${index * 0.1}s`,
              }}
            >
              <CatalogCard
                item={item}
              />
            </div>
          )
        )}
      </div>
    </section>
  )
}