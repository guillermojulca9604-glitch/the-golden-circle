import Link from "next/link"

import {
  AdminVideoUpload,
} from "./admin-video-upload"

import {
  approveVideo,
  moveVideoToTrash,
  rejectVideo,
} from "./actions"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type VideoStatus =
  | "pending"
  | "approved"
  | "rejected"

type VideosPageProps = {
  searchParams: Promise<{
    status?:
      | string
      | string[]
  }>
}

type VideoRow = {
  id: string
  video_path: string | null
  thumbnail_path: string | null
  duration_seconds: number | null
  status: VideoStatus
  rejection_reason: string | null
  published_at: string | null
  created_at: string
}

type AdminVideo =
  VideoRow & {
    thumbnailUrl: string | null
    downloadUrl: string | null
  }

type FilterItem = {
  status: VideoStatus
  label: string
}

const FILTERS:
  FilterItem[] = [
    {
      status: "pending",
      label: "Pendientes",
    },
    {
      status: "approved",
      label: "Aprobados",
    },
    {
      status: "rejected",
      label: "Desaprobados",
    },
  ]

const DATE_FORMATTER =
  new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "America/Lima",
    }
  )

function getSelectedStatus(
  value:
    | string
    | string[]
    | undefined
): VideoStatus {
  const normalizedValue =
    Array.isArray(value)
      ? value[0]
      : value

  if (
    normalizedValue ===
      "approved" ||
    normalizedValue ===
      "rejected"
  ) {
    return normalizedValue
  }

  return "pending"
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-"
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-"
  }

  return DATE_FORMATTER
    .format(date)
}

function formatDuration(
  durationSeconds:
    number | null
) {
  if (
    durationSeconds === null ||
    !Number.isFinite(
      durationSeconds
    ) ||
    durationSeconds < 0
  ) {
    return "--:--"
  }

  const totalSeconds =
    Math.floor(
      durationSeconds
    )

  const hours =
    Math.floor(
      totalSeconds / 3600
    )

  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60
    )

  const seconds =
    totalSeconds % 60

  const paddedMinutes =
    String(minutes)
      .padStart(2, "0")

  const paddedSeconds =
    String(seconds)
      .padStart(2, "0")

  if (hours > 0) {
    return (
      `${hours}:` +
      `${paddedMinutes}:` +
      paddedSeconds
    )
  }

  return (
    `${paddedMinutes}:` +
    paddedSeconds
  )
}

function getVideoDate(
  video: VideoRow
) {
  if (
    video.status ===
    "approved"
  ) {
    return (
      video.published_at ??
      video.created_at
    )
  }

  return video.created_at
}

function getEmptyMessage(
  status: VideoStatus
) {
  if (
    status === "approved"
  ) {
    return "No hay videos aprobados."
  }

  if (
    status === "rejected"
  ) {
    return "No hay videos desaprobados."
  }

  return "No hay videos pendientes."
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
    >
      <circle
        cx="5"
        cy="12"
        r="1.5"
      />

      <circle
        cx="12"
        cy="12"
        r="1.5"
      />

      <circle
        cx="19"
        cy="12"
        r="1.5"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 4v10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="m8 10 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RejectIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m6 7 1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function VideoActions({
  video,
}: {
  video: AdminVideo
}) {
  return (
    <details className="group">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-gold/20 bg-black px-4 text-xs text-foreground/80 transition-colors hover:border-gold/40 hover:bg-gold/[0.05] hover:text-gold focus-visible:border-gold/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <MoreIcon />

        Administrar
      </summary>

      <div className="mt-3 rounded-xl border border-gold/15 bg-[#070706] p-3">
        <div className="space-y-2">
          {video.downloadUrl ? (
            <a
              href={
                video.downloadUrl
              }
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gold/20 bg-black px-4 text-xs text-gold transition-colors hover:border-gold/45 hover:bg-gold/[0.06] focus-visible:border-gold/60 focus-visible:outline-none"
            >
              <DownloadIcon />

              Descargar video
            </a>
          ) : (
            <div className="flex min-h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-black px-4 text-xs text-muted-foreground opacity-60">
              <DownloadIcon />

              Descarga no disponible
            </div>
          )}

          {video.status ===
            "pending" && (
            <>
              <form
                action={
                  approveVideo
                }
              >
                <input
                  type="hidden"
                  name="videoId"
                  value={
                    video.id
                  }
                />

                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gold/35 bg-gold/[0.08] px-4 text-xs font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.14] focus-visible:border-gold/70 focus-visible:outline-none"
                >
                  <CheckIcon />

                  Aprobar video
                </button>
              </form>

              <details className="group/reject rounded-lg border border-red-500/20 bg-red-500/[0.025]">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 px-4 text-xs text-red-300 transition-colors hover:bg-red-500/[0.07] focus-visible:bg-red-500/[0.07] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  <RejectIcon />

                  Desaprobar video
                </summary>

                <form
                  action={
                    rejectVideo
                  }
                  className="border-t border-red-500/15 p-3"
                >
                  <input
                    type="hidden"
                    name="videoId"
                    value={
                      video.id
                    }
                  />

                  <label
                    htmlFor={`rejection-${video.id}`}
                    className="block text-[11px] leading-5 text-red-200/80"
                  >
                    Motivo de desaprobación
                  </label>

                  <textarea
                    id={`rejection-${video.id}`}
                    name="rejectionReason"
                    required
                    maxLength={500}
                    rows={3}
                    placeholder="Explica por qué el video fue desaprobado."
                    className="mt-2 w-full resize-none rounded-lg border border-red-500/25 bg-black px-3 py-2 text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-red-500/50"
                  />

                  <button
                    type="submit"
                    className="mt-3 min-h-10 w-full rounded-lg border border-red-500/35 bg-red-500/[0.09] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/55 hover:bg-red-500/[0.15] focus-visible:border-red-500/70 focus-visible:outline-none"
                  >
                    Confirmar desaprobación
                  </button>
                </form>
              </details>
            </>
          )}

          {video.status ===
            "rejected" && (
            <>
              {video.rejection_reason && (
                <div className="rounded-lg border border-red-500/15 bg-red-500/[0.025] px-3 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-red-300/70">
                    Motivo
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-red-100/75">
                    {
                      video.rejection_reason
                    }
                  </p>
                </div>
              )}

              <form
                action={
                  approveVideo
                }
              >
                <input
                  type="hidden"
                  name="videoId"
                  value={
                    video.id
                  }
                />

                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gold/35 bg-gold/[0.08] px-4 text-xs font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/[0.14] focus-visible:border-gold/70 focus-visible:outline-none"
                >
                  <CheckIcon />

                  Aprobar video
                </button>
              </form>
            </>
          )}

          {video.status ===
            "approved" && (
            <details className="group/trash rounded-lg border border-red-500/20 bg-red-500/[0.025]">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 px-4 text-xs text-red-300 transition-colors hover:bg-red-500/[0.07] focus-visible:bg-red-500/[0.07] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                <TrashIcon />

                Mover a Papelera
              </summary>

              <div className="border-t border-red-500/15 p-3">
                <p className="text-xs leading-5 text-red-200/75">
                  El video desaparecerá inmediatamente del área VIP, pero podrá restaurarse desde la Papelera.
                </p>

                <form
                  action={
                    moveVideoToTrash
                  }
                  className="mt-3"
                >
                  <input
                    type="hidden"
                    name="videoId"
                    value={
                      video.id
                    }
                  />

                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-lg border border-red-500/35 bg-red-500/[0.09] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/55 hover:bg-red-500/[0.15] focus-visible:border-red-500/70 focus-visible:outline-none"
                  >
                    Confirmar envío
                  </button>
                </form>
              </div>
            </details>
          )}
        </div>
      </div>
    </details>
  )
}

export default async function VideosPage({
  searchParams,
}: VideosPageProps) {
  const resolvedSearchParams =
    await searchParams

  const selectedStatus =
    getSelectedStatus(
      resolvedSearchParams.status
    )

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("vip_videos")
      .select(
        `
          id,
          video_path,
          thumbnail_path,
          duration_seconds,
          status,
          rejection_reason,
          published_at,
          created_at
        `
      )
      .in(
        "status",
        [
          "pending",
          "approved",
          "rejected",
        ]
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )

  if (error) {
    console.error(
      "No se pudieron cargar los videos:",
      error
    )
  }

  const rows =
    (
      data ?? []
    ) as VideoRow[]

  const statusCounts:
    Record<
      VideoStatus,
      number
    > = {
      pending: 0,
      approved: 0,
      rejected: 0,
    }

  for (const video of rows) {
    statusCounts[
      video.status
    ] += 1
  }

  const selectedRows =
    rows.filter(
      (video) =>
        video.status ===
        selectedStatus
    )

  const videos:
    AdminVideo[] =
    await Promise.all(
      selectedRows.map(
        async (video) => {
          let thumbnailUrl:
            string | null =
            null

          let downloadUrl:
            string | null =
            null

          if (
            video.thumbnail_path
          ) {
            const {
              data:
                thumbnailData,
              error:
                thumbnailError,
            } =
              await supabaseAdmin
                .storage
                .from(
                  "vip-thumbnails"
                )
                .createSignedUrl(
                  video.thumbnail_path,
                  3600
                )

            if (
              thumbnailError
            ) {
              console.error(
                "No se pudo crear la miniatura firmada:",
                thumbnailError
              )
            } else {
              thumbnailUrl =
                thumbnailData
                  ?.signedUrl ??
                null
            }
          }

          if (
            video.video_path
          ) {
            const {
              data:
                videoData,
              error:
                videoUrlError,
            } =
              await supabaseAdmin
                .storage
                .from(
                  "vip-videos"
                )
                .createSignedUrl(
                  video.video_path,
                  3600,
                  {
                    download:
                      true,
                  }
                )

            if (
              videoUrlError
            ) {
              console.error(
                "No se pudo crear la descarga firmada:",
                videoUrlError
              )
            } else {
              downloadUrl =
                videoData
                  ?.signedUrl ??
                null
            }
          }

          return {
            ...video,
            thumbnailUrl,
            downloadUrl,
          }
        }
      )
    )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
              Videos
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Pendientes, aprobados y desaprobados
            </p>
          </div>

          <AdminVideoUpload />
        </div>
      </section>

      <nav
        aria-label="Filtros de videos"
        className="mt-7 flex gap-2 overflow-x-auto pb-1"
      >
        {FILTERS.map(
          (filter) => {
            const isActive =
              filter.status ===
              selectedStatus

            return (
              <Link
                key={
                  filter.status
                }
                href={
                  `/admin/videos?status=${filter.status}`
                }
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm transition-colors ${
                  isActive
                    ? "border-gold/55 bg-gold/[0.09] text-gold"
                    : "border-gold/15 bg-black text-muted-foreground hover:border-gold/35 hover:text-foreground"
                }`}
              >
                {
                  filter.label
                }

                <span
                  className={`min-w-[1ch] text-center font-sans text-xs font-semibold tabular-nums ${
                    isActive
                      ? "text-gold"
                      : "text-muted-foreground"
                  }`}
                >
                  {
                    statusCounts[
                      filter.status
                    ]
                  }
                </span>
              </Link>
            )
          }
        )}
      </nav>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar los videos.
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map(
          (video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-gold/20 bg-black"
            >
              <div
                role="img"
                aria-label="Miniatura del video"
                className="relative aspect-video bg-black bg-cover bg-center"
                style={{
                  backgroundImage:
                    video.thumbnailUrl
                      ? `url("${video.thumbnailUrl}")`
                      : undefined,
                }}
              >
                {!video.thumbnailUrl && (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Sin miniatura
                  </div>
                )}

                <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-2 py-1 font-sans text-xs font-semibold tabular-nums text-white">
                  {formatDuration(
                    video.duration_seconds
                  )}
                </span>
              </div>

              <div className="p-4">
                <p className="font-sans text-xs tabular-nums text-muted-foreground">
                  {formatDate(
                    getVideoDate(
                      video
                    )
                  )}
                </p>

                <div className="mt-4">
                  <VideoActions
                    video={video}
                  />
                </div>
              </div>
            </article>
          )
        )}

        {!videos.length &&
          !error && (
            <div className="col-span-full rounded-2xl border border-gold/15 bg-black px-5 py-8 text-center text-sm text-muted-foreground">
              {getEmptyMessage(
                selectedStatus
              )}
            </div>
          )}
      </section>
    </div>
  )
}