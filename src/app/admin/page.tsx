import Link from "next/link"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type PaymentProofRow = {
  id: string
  email: string
  plan: string
  created_at: string
}

type VideoRow = {
  id: string
  thumbnail_path: string | null
  duration_seconds: number | null
  published_at: string | null
  created_at: string
}

type RecentVideo =
  VideoRow & {
    thumbnailUrl: string | null
  }

type SummaryCardProps = {
  href: string
  label: string
  description: string
  value: string
  icon:
    | "payments"
    | "memberships"
    | "expired"
    | "videos"
}

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

function SummaryIcon({
  icon,
}: {
  icon:
    SummaryCardProps["icon"]
}) {
  if (icon === "payments") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        <path
          d="M3 9h18"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        <path
          d="M7 15h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (
    icon === "memberships"
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
      >
        <circle
          cx="9"
          cy="8"
          r="4"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        <path
          d="M3 20v-1.5A3.5 3.5 0 0 1 6.5 15h5a3.5 3.5 0 0 1 3.5 3.5V20"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        <path
          d="m16 11 1.8 1.8L22 8.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (icon === "expired") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M5.6 18.4 18.4 5.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
    >
      <rect
        x="3"
        y="5"
        width="14"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m17 10 4-2v8l-4-2v-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="m9 9 4 3-4 3V9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SummaryCard({
  href,
  label,
  description,
  value,
  icon,
}: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="telegram-button block rounded-2xl border border-gold/30 p-5 text-left transition-colors hover:border-gold/50"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-black/20 text-gold">
        <SummaryIcon
          icon={icon}
        />
      </span>

      <p className="mt-6 text-3xl font-semibold text-foreground">
        {value}
      </p>

      <h2 className="mt-2 text-sm font-medium text-foreground">
        {label}
      </h2>

      <p className="mt-1 text-xs leading-5 text-foreground/70">
        {description}
      </p>
    </Link>
  )
}

export default async function AdminPage() {
  const now =
    new Date().toISOString()

  const [
    approvedPaymentsResult,
    activeMembershipsResult,
    expiredMembershipsResult,
    publishedVideosResult,
    recentPaymentsResult,
    recentVideosResult,
  ] =
    await Promise.all([
      supabaseAdmin
        .from(
          "payment_proofs"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "status",
          "approved"
        )
        .is(
          "deleted_at",
          null
        ),

      supabaseAdmin
        .from("memberships")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "status",
          "active"
        )
        .gt(
          "expires_at",
          now
        )
        .is(
          "deleted_at",
          null
        ),

      supabaseAdmin
        .from("memberships")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "status",
          "disabled"
        )
        .is(
          "deleted_at",
          null
        ),

      supabaseAdmin
        .from("vip_videos")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "status",
          "approved"
        )
        .is(
          "deleted_at",
          null
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
            created_at
          `
        )
        .eq(
          "status",
          "approved"
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
        .limit(5),

      supabaseAdmin
        .from("vip_videos")
        .select(
          `
            id,
            thumbnail_path,
            duration_seconds,
            published_at,
            created_at
          `
        )
        .eq(
          "status",
          "approved"
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "published_at",
          {
            ascending: false,
            nullsFirst: false,
          }
        )
        .limit(4),
    ])

  const hasSummaryError =
    Boolean(
      approvedPaymentsResult.error ||
      activeMembershipsResult.error ||
      expiredMembershipsResult.error ||
      publishedVideosResult.error
    )

  if (
    approvedPaymentsResult.error
  ) {
    console.error(
      "No se pudo cargar el total de pagos aprobados:",
      approvedPaymentsResult.error
    )
  }

  if (
    activeMembershipsResult.error
  ) {
    console.error(
      "No se pudo cargar el total de membresías activas:",
      activeMembershipsResult.error
    )
  }

  if (
    expiredMembershipsResult.error
  ) {
    console.error(
      "No se pudo cargar el total de VIP vencidos:",
      expiredMembershipsResult.error
    )
  }

  if (
    publishedVideosResult.error
  ) {
    console.error(
      "No se pudo cargar el total de videos publicados:",
      publishedVideosResult.error
    )
  }

  if (
    recentPaymentsResult.error
  ) {
    console.error(
      "No se pudieron cargar los pagos recientes:",
      recentPaymentsResult.error
    )
  }

  if (
    recentVideosResult.error
  ) {
    console.error(
      "No se pudieron cargar los videos recientes:",
      recentVideosResult.error
    )
  }

  const recentPayments =
    (
      recentPaymentsResult
        .data ?? []
    ) as PaymentProofRow[]

  const rawRecentVideos =
    (
      recentVideosResult
        .data ?? []
    ) as VideoRow[]

  const recentVideos:
    RecentVideo[] =
    await Promise.all(
      rawRecentVideos.map(
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
              "No se pudo crear la miniatura firmada:",
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

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Resumen
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Estado general del sistema
        </p>
      </section>

      {hasSummaryError && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          Algunas métricas no pudieron cargarse.
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          href="/admin/approved"
          label="Pagos aprobados"
          description="Comprobantes confirmados."
          value={
            approvedPaymentsResult.error
              ? "—"
              : String(
                  approvedPaymentsResult
                    .count ?? 0
                )
          }
          icon="payments"
        />

        <SummaryCard
          href="/admin/activated"
          label="Membresías activas"
          description="Usuarios con acceso VIP vigente."
          value={
            activeMembershipsResult.error
              ? "—"
              : String(
                  activeMembershipsResult
                    .count ?? 0
                )
          }
          icon="memberships"
        />

        <SummaryCard
          href="/admin/disabled"
          label="VIP vencidos"
          description="Membresías que finalizaron."
          value={
            expiredMembershipsResult.error
              ? "—"
              : String(
                  expiredMembershipsResult
                    .count ?? 0
                )
          }
          icon="expired"
        />

        <SummaryCard
          href="/admin/videos?status=approved"
          label="Videos publicados"
          description="Videos aprobados para el VIP."
          value={
            publishedVideosResult.error
              ? "—"
              : String(
                  publishedVideosResult
                    .count ?? 0
                )
          }
          icon="videos"
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gold/20 bg-black p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-foreground">
                Pagos recientes
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Últimos comprobantes aprobados.
              </p>
            </div>

            <Link
              href="/admin/approved"
              className="shrink-0 text-sm text-gold transition-colors hover:text-gold/80"
            >
              Ver todos
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentPayments.map(
              (payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl border border-gold/10 bg-black p-4 sm:flex sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {payment.email}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPlan(
                        payment.plan
                      )}
                    </p>
                  </div>

                  <p className="mt-3 shrink-0 text-xs text-muted-foreground sm:mt-0">
                    {formatDate(
                      payment.created_at
                    )}
                  </p>
                </div>
              )
            )}

            {!recentPayments.length && (
              <div className="rounded-xl border border-gold/10 bg-black px-4 py-6 text-center text-sm text-muted-foreground">
                No hay pagos aprobados.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gold/20 bg-black p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-foreground">
                Videos recientes
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Últimos videos aprobados.
              </p>
            </div>

            <Link
              href="/admin/videos?status=approved"
              className="shrink-0 text-sm text-gold transition-colors hover:text-gold/80"
            >
              Ver todos
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {recentVideos.map(
              (video) => (
                <Link
                  key={video.id}
                  href="/admin/videos?status=approved"
                  className="overflow-hidden rounded-xl border border-gold/10 bg-black transition-colors hover:border-gold/30"
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

                    <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-xs text-white">
                      {formatDuration(
                        video.duration_seconds
                      )}
                    </span>
                  </div>

                  <div className="px-3 py-3">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(
                        video.published_at ??
                          video.created_at
                      )}
                    </p>
                  </div>
                </Link>
              )
            )}

            {!recentVideos.length && (
              <div className="col-span-full rounded-xl border border-gold/10 bg-black px-4 py-6 text-center text-sm text-muted-foreground">
                No hay videos publicados.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}