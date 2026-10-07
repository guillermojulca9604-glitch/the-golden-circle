import Link from "next/link"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

import TelegramMaintenanceCard from "./components/telegram-maintenance-card"

export const dynamic =
  "force-dynamic"

type SummaryCardProps = {
  href: string
  label: string
  description: string
  value: string
  icon:
    | "payments"
    | "memberships"
    | "expired"
}

type TelegramServiceState = {
  id: number
  maintenance: boolean
  message: string
  maintenance_started_at:
    | string
    | null
  updated_at: string
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
    icon ===
      "memberships"
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
    new Date()
      .toISOString()

  const [
    approvedPaymentsResult,
    activeMembershipsResult,
    expiredMembershipsResult,
    telegramServiceStateResult,
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
        .from(
          "memberships"
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
        .from(
          "memberships"
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
          "disabled"
        )
        .is(
          "deleted_at",
          null
        ),

      supabaseAdmin
        .from(
          "telegram_service_state"
        )
        .select(
          `
            id,
            maintenance,
            message,
            maintenance_started_at,
            updated_at
          `
        )
        .eq(
          "id",
          1
        )
        .single(),
    ])

  const hasSummaryError =
    Boolean(
      approvedPaymentsResult.error ||
      activeMembershipsResult.error ||
      expiredMembershipsResult.error
    )

  if (
    approvedPaymentsResult
      .error
  ) {
    console.error(
      "No se pudo cargar el total de pagos aprobados:",
      approvedPaymentsResult
        .error
    )
  }

  if (
    activeMembershipsResult
      .error
  ) {
    console.error(
      "No se pudo cargar el total de membresías activas:",
      activeMembershipsResult
        .error
    )
  }

  if (
    expiredMembershipsResult
      .error
  ) {
    console.error(
      "No se pudo cargar el total de VIP vencidos:",
      expiredMembershipsResult
        .error
    )
  }

  if (
    telegramServiceStateResult
      .error
  ) {
    console.error(
      "No se pudo cargar el estado de Telegram:",
      telegramServiceStateResult
        .error
    )
  }

  const telegramInitialState =
    (
      telegramServiceStateResult
        .data ?? {
        id: 1,

        maintenance:
          false,

        message:
          "The Golden Circle se encuentra temporalmente en mantenimiento.",

        maintenance_started_at:
          null,

        updated_at:
          now,
      }
    ) as TelegramServiceState

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

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          href="/admin/approved"
          label="Pagos aprobados"
          description="Comprobantes confirmados."
          value={
            approvedPaymentsResult
              .error
              ? "—"
              : String(
                  approvedPaymentsResult
                    .count ??
                    0
                )
          }
          icon="payments"
        />

        <SummaryCard
          href="/admin/activated"
          label="Membresías activas"
          description="Usuarios con acceso VIP vigente."
          value={
            activeMembershipsResult
              .error
              ? "—"
              : String(
                  activeMembershipsResult
                    .count ??
                    0
                )
          }
          icon="memberships"
        />

        <SummaryCard
          href="/admin/disabled"
          label="VIP vencidos"
          description="Membresías que finalizaron."
          value={
            expiredMembershipsResult
              .error
              ? "—"
              : String(
                  expiredMembershipsResult
                    .count ??
                    0
                )
          }
          icon="expired"
        />
      </section>

      <TelegramMaintenanceCard
        initialState={
          telegramInitialState
        }
      />
    </div>
  )
}