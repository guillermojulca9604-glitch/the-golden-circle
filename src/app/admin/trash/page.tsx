import Link from "next/link"

import {
  deleteMembershipForever,
  deleteProofForever,
  restoreMembership,
  restoreProof,
} from "../proofs/actions"
import {
  ProofImagePreview,
} from "../proofs/proof-image-preview"
import {
  deleteVideoForever,
  restoreVideo,
} from "../videos/actions"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type TrashFilter =
  | "all"
  | "videos"
  | "payments"
  | "memberships"

type TrashPageProps = {
  searchParams: Promise<{
    type?:
      | string
      | string[]
  }>
}

type DeletedVideoRow = {
  id: string
  thumbnail_path: string | null
  duration_seconds: number | null
  deleted_at: string | null
  created_at: string
}

type DeletedVideo =
  DeletedVideoRow & {
    thumbnailUrl: string | null
  }

type DeletedPayment = {
  id: string
  email: string
  plan: string
  status: string
  proof_url: string | null
  created_at: string
  deleted_at: string | null
}

type DeletedMembership = {
  id: string
  email: string
  plan: string
  status: string
  expires_at: string | null
  deactivated_reason: string | null
  deleted_at: string | null
}

type FilterItem = {
  value: TrashFilter
  label: string
}

const FILTERS:
  FilterItem[] = [
    {
      value: "all",
      label: "Todos",
    },
    {
      value: "videos",
      label: "Videos",
    },
    {
      value: "payments",
      label: "Pagos",
    },
    {
      value: "memberships",
      label: "VIP vencidos",
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

function getSelectedFilter(
  value:
    | string
    | string[]
    | undefined
): TrashFilter {
  const normalizedValue =
    Array.isArray(value)
      ? value[0]
      : value

  if (
    normalizedValue ===
      "videos" ||
    normalizedValue ===
      "payments" ||
    normalizedValue ===
      "memberships"
  ) {
    return normalizedValue
  }

  return "all"
}

function getEmptyMessage(
  filter: TrashFilter
) {
  if (filter === "videos") {
    return "No hay videos en la Papelera."
  }

  if (
    filter === "payments"
  ) {
    return "No hay pagos en la Papelera."
  }

  if (
    filter === "memberships"
  ) {
    return "No hay VIP vencidos en la Papelera."
  }

  return "La Papelera está vacía."
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

function formatPlan(
  plan: string
) {
  return plan ===
    "quarterly"
    ? "Trimestral"
    : "Mensual"
}

function formatPaymentStatus(
  status: string
) {
  if (
    status === "approved"
  ) {
    return "Aprobado"
  }

  if (
    status === "rejected"
  ) {
    return "Rechazado"
  }

  if (
    status === "pending"
  ) {
    return "Pendiente"
  }

  return status
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

function RestoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M4 8v5h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5.5 12a7 7 0 1 0 2-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
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

export default async function TrashPage({
  searchParams,
}: TrashPageProps) {
  const resolvedSearchParams =
    await searchParams

  const selectedFilter =
    getSelectedFilter(
      resolvedSearchParams.type
    )

  const [
    videosResult,
    paymentsResult,
    membershipsResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from("vip_videos")
        .select(
          `
            id,
            thumbnail_path,
            duration_seconds,
            deleted_at,
            created_at
          `
        )
        .eq(
          "status",
          "deleted"
        )
        .not(
          "deleted_at",
          "is",
          null
        )
        .order(
          "deleted_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        ),

      supabaseAdmin
        .from(
          "payment_proofs"
        )
        .select(
          `
            id,
            email,
            plan,
            status,
            proof_url,
            created_at,
            deleted_at
          `
        )
        .not(
          "deleted_at",
          "is",
          null
        )
        .order(
          "deleted_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        ),

      supabaseAdmin
        .from("memberships")
        .select(
          `
            id,
            email,
            plan,
            status,
            expires_at,
            deactivated_reason,
            deleted_at
          `
        )
        .not(
          "deleted_at",
          "is",
          null
        )
        .order(
          "deleted_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        ),
    ])

  if (videosResult.error) {
    console.error(
      "No se pudieron cargar los videos de la Papelera:",
      videosResult.error
    )
  }

  if (paymentsResult.error) {
    console.error(
      "No se pudieron cargar los pagos de la Papelera:",
      paymentsResult.error
    )
  }

  if (
    membershipsResult.error
  ) {
    console.error(
      "No se pudieron cargar los VIP vencidos de la Papelera:",
      membershipsResult.error
    )
  }

  const videoRows =
    (
      videosResult.data ?? []
    ) as DeletedVideoRow[]

  const payments =
    (
      paymentsResult.data ?? []
    ) as DeletedPayment[]

  const memberships =
    (
      membershipsResult
        .data ?? []
    ) as DeletedMembership[]

  /*
   * En la Papelera solamente se genera
   * una URL para mostrar la miniatura.
   *
   * No se genera URL del video,
   * reproducción ni descarga.
   */
  const videos:
    DeletedVideo[] =
    await Promise.all(
      videoRows.map(
        async (video) => {
          if (
            !video.thumbnail_path
          ) {
            return {
              ...video,
              thumbnailUrl:
                null,
            }
          }

          const {
            data,
            error,
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

          if (error) {
            console.error(
              "No se pudo crear una miniatura para la Papelera:",
              error
            )
          }

          return {
            ...video,
            thumbnailUrl:
              data?.signedUrl ??
              null,
          }
        }
      )
    )

  const totalCount =
    videos.length +
    payments.length +
    memberships.length

  const filterCounts:
    Record<
      TrashFilter,
      number
    > = {
      all: totalCount,
      videos:
        videos.length,
      payments:
        payments.length,
      memberships:
        memberships.length,
    }

  const selectedCount =
    filterCounts[
      selectedFilter
    ]

  const showVideos =
    selectedFilter === "all" ||
    selectedFilter ===
      "videos"

  const showPayments =
    selectedFilter === "all" ||
    selectedFilter ===
      "payments"

  const showMemberships =
    selectedFilter === "all" ||
    selectedFilter ===
      "memberships"

  const hasError =
    Boolean(
      videosResult.error ||
      paymentsResult.error ||
      membershipsResult.error
    )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Papelera
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Restaura elementos eliminados o bórralos permanentemente.
        </p>
      </section>

      <nav
        aria-label="Filtros de la Papelera"
        className="mt-7 flex gap-2 overflow-x-auto pb-1"
      >
        {FILTERS.map(
          (filter) => {
            const isActive =
              filter.value ===
              selectedFilter

            const href =
              filter.value ===
              "all"
                ? "/admin/trash"
                : `/admin/trash?type=${filter.value}`

            return (
              <Link
                key={
                  filter.value
                }
                href={href}
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
                {filter.label}

                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-gold/15 text-gold"
                      : "bg-white/[0.04] text-muted-foreground"
                  }`}
                >
                  {
                    filterCounts[
                      filter.value
                    ]
                  }
                </span>
              </Link>
            )
          }
        )}
      </nav>

      {hasError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Algunos elementos de la Papelera no pudieron cargarse.
        </div>
      )}

      {!hasError &&
        selectedCount === 0 && (
          <div className="mt-7 rounded-2xl border border-gold/15 bg-black px-5 py-10 text-center text-sm text-muted-foreground">
            {getEmptyMessage(
              selectedFilter
            )}
          </div>
        )}

      {!hasError &&
        selectedCount > 0 && (
          <div className="mt-8 space-y-6">
            {showVideos &&
              videos.length >
                0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {videos.map(
                    (video) => (
                      <article
                        key={video.id}
                        className="overflow-hidden rounded-2xl border border-gold/20 bg-black"
                      >
                        <div
                          role="img"
                          aria-label="Miniatura del video eliminado"
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

                          <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-2 py-1 text-xs text-white">
                            {formatDuration(
                              video.duration_seconds
                            )}
                          </span>
                        </div>

                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              Eliminado el{" "}
                              {formatDate(
                                video.deleted_at
                              )}
                            </p>

                            <span className="rounded-full border border-red-500/20 bg-red-500/[0.05] px-2.5 py-1 text-[10px] text-red-300">
                              Video
                            </span>
                          </div>

                          <div className="mt-4 grid gap-2">
                            <form
                              action={
                                restoreVideo
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
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/[0.06] px-4 text-sm text-gold transition-colors hover:border-gold/55 hover:bg-gold/[0.11] focus-visible:border-gold/70 focus-visible:outline-none"
                              >
                                <RestoreIcon />

                                Restaurar
                              </button>
                            </form>

                            <details className="group rounded-xl border border-red-500/20 bg-red-500/[0.025]">
                              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 text-sm text-red-300 transition-colors hover:bg-red-500/[0.06] focus-visible:bg-red-500/[0.06] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                                <DeleteIcon />

                                Eliminar permanentemente
                              </summary>

                              <div className="border-t border-red-500/15 p-3">
                                <p className="text-xs leading-5 text-red-200/75">
                                  Se borrarán el archivo, la miniatura, el progreso y el registro del video. No se podrá recuperar.
                                </p>

                                <form
                                  action={
                                    deleteVideoForever
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
                                    className="min-h-10 w-full rounded-lg border border-red-500/40 bg-red-500/[0.1] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/60 hover:bg-red-500/[0.16] focus-visible:border-red-500/75 focus-visible:outline-none"
                                  >
                                    Confirmar eliminación
                                  </button>
                                </form>
                              </div>
                            </details>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}

            {showPayments &&
              payments.length >
                0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {payments.map(
                    (payment) => (
                      <article
                        key={
                          payment.id
                        }
                        className="rounded-2xl border border-gold/20 bg-black p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p
                              title={
                                payment.email
                              }
                              className="truncate text-sm font-medium text-foreground"
                            >
                              {
                                payment.email
                              }
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Eliminado el{" "}
                              {formatDate(
                                payment.deleted_at
                              )}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full border border-gold/20 bg-gold/[0.05] px-2.5 py-1 text-[10px] text-gold">
                            Pago
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-gold/10 bg-white/[0.015] p-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Plan
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatPlan(
                                payment.plan
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Estado
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatPaymentStatus(
                                payment.status
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Fecha original
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatDate(
                                payment.created_at
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Comprobante
                            </p>

                            <div className="mt-2 text-sm">
                              {payment.proof_url ? (
                                <ProofImagePreview
                                  url={
                                    payment.proof_url
                                  }
                                />
                              ) : (
                                <span className="text-muted-foreground">
                                  No disponible
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <form
                            action={
                              restoreProof
                            }
                          >
                            <input
                              type="hidden"
                              name="proofId"
                              value={
                                payment.id
                              }
                            />

                            <button
                              type="submit"
                              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/[0.06] px-4 text-sm text-gold transition-colors hover:border-gold/55 hover:bg-gold/[0.11] focus-visible:border-gold/70 focus-visible:outline-none"
                            >
                              <RestoreIcon />

                              Restaurar
                            </button>
                          </form>

                          <details className="group rounded-xl border border-red-500/20 bg-red-500/[0.025]">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 text-sm text-red-300 transition-colors hover:bg-red-500/[0.06] focus-visible:bg-red-500/[0.06] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                              <DeleteIcon />

                              Eliminar permanentemente
                            </summary>

                            <div className="border-t border-red-500/15 p-3">
                              <p className="text-xs leading-5 text-red-200/75">
                                El registro del pago se eliminará de Supabase. La membresía y la cuenta del cliente no se eliminarán.
                              </p>

                              <form
                                action={
                                  deleteProofForever
                                }
                                className="mt-3"
                              >
                                <input
                                  type="hidden"
                                  name="proofId"
                                  value={
                                    payment.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="min-h-10 w-full rounded-lg border border-red-500/40 bg-red-500/[0.1] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/60 hover:bg-red-500/[0.16] focus-visible:border-red-500/75 focus-visible:outline-none"
                                >
                                  Confirmar eliminación
                                </button>
                              </form>
                            </div>
                          </details>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}

            {showMemberships &&
              memberships.length >
                0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {memberships.map(
                    (membership) => (
                      <article
                        key={
                          membership.id
                        }
                        className="rounded-2xl border border-gold/20 bg-black p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p
                              title={
                                membership.email
                              }
                              className="truncate text-sm font-medium text-foreground"
                            >
                              {
                                membership.email
                              }
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Eliminado el{" "}
                              {formatDate(
                                membership.deleted_at
                              )}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full border border-zinc-500/25 bg-zinc-500/[0.05] px-2.5 py-1 text-[10px] text-zinc-300">
                            VIP vencido
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-gold/10 bg-white/[0.015] p-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Plan
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatPlan(
                                membership.plan
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Vencimiento
                            </p>

                            <p className="mt-2 text-sm text-muted-foreground">
                              {formatDate(
                                membership.expires_at
                              )}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-widest text-gold/55">
                              Motivo
                            </p>

                            <p className="mt-2 text-sm leading-5 text-muted-foreground">
                              {
                                membership.deactivated_reason ??
                                "Finalizada"
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <form
                            action={
                              restoreMembership
                            }
                          >
                            <input
                              type="hidden"
                              name="membershipId"
                              value={
                                membership.id
                              }
                            />

                            <button
                              type="submit"
                              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/[0.06] px-4 text-sm text-gold transition-colors hover:border-gold/55 hover:bg-gold/[0.11] focus-visible:border-gold/70 focus-visible:outline-none"
                            >
                              <RestoreIcon />

                              Restaurar
                            </button>
                          </form>

                          <details className="group rounded-xl border border-red-500/20 bg-red-500/[0.025]">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-4 text-sm text-red-300 transition-colors hover:bg-red-500/[0.06] focus-visible:bg-red-500/[0.06] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                              <DeleteIcon />

                              Eliminar permanentemente
                            </summary>

                            <div className="border-t border-red-500/15 p-3">
                              <p className="text-xs leading-5 text-red-200/75">
                                La membresía se eliminará permanentemente de Supabase. La cuenta y los pagos del cliente permanecerán intactos.
                              </p>

                              <form
                                action={
                                  deleteMembershipForever
                                }
                                className="mt-3"
                              >
                                <input
                                  type="hidden"
                                  name="membershipId"
                                  value={
                                    membership.id
                                  }
                                />

                                <button
                                  type="submit"
                                  className="min-h-10 w-full rounded-lg border border-red-500/40 bg-red-500/[0.1] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/60 hover:bg-red-500/[0.16] focus-visible:border-red-500/75 focus-visible:outline-none"
                                >
                                  Confirmar eliminación
                                </button>
                              </form>
                            </div>
                          </details>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
          </div>
        )}
    </div>
  )
}