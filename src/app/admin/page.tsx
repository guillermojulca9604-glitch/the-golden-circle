
import Link from "next/link"

import { supabaseAdmin } from "@/lib/supabase/admin"

import TelegramMaintenanceCard from "./components/telegram-maintenance-card"

export const dynamic = "force-dynamic"

type SummaryCardProps = {
  href: string
  label: string
  description?: string
  value: string
  icon: "payments" | "memberships"
  amount?: string
}

type TelegramServiceState = {
  id: number
  maintenance: boolean
  message: string
  maintenance_started_at: string | null
  updated_at: string
}

type PaymentAmountRow = {
  id: string
  amount_paid: number | null
  currency_id: string | null
}

const MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function SummaryIcon({
  icon,
}: {
  icon: SummaryCardProps["icon"]
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
        strokeLinejoin="round"
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

function SummaryCard({
  href,
  label,
  description,
  value,
  icon,
  amount,
}: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="telegram-button block rounded-2xl border border-gold/30 p-5 text-left transition-colors hover:border-gold/50"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-black/20 text-gold">
        <SummaryIcon icon={icon} />
      </span>

      {icon === "payments" ? (
        <>
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-center gap-4">
            <div className="min-w-0">
              <p className="text-3xl font-semibold text-foreground">
                {value}
              </p>

              <h2 className="mt-2 text-sm font-medium text-foreground">
                {label}
              </h2>
            </div>

            <div
              aria-hidden="true"
              className="h-10 w-px self-center bg-gold/20"
            />

            <div className="min-w-0">
              <p className="break-words text-3xl font-semibold text-gold">
                {amount ?? "—"}
              </p>

              <p className="mt-2 text-sm font-medium text-foreground">
                Monto acumulado
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-foreground/70">
            Total histórico de pagos aprobados
          </p>
        </>
      ) : (
        <>
          <p className="mt-6 text-3xl font-semibold text-foreground">
            {value}
          </p>

          <h2 className="mt-2 text-sm font-medium text-foreground">
            {label}
          </h2>

          <p className="mt-1 text-xs leading-5 text-foreground/70">
            {description}
          </p>
        </>
      )}
    </Link>
  )
}

async function getPaymentStatistics() {
  const pageSize = 500

  let offset = 0
  let totalCount = 0
  let totalCents = 0
  let missingAmounts = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("payment_attempts")
      .select("id, amount_paid, currency_id")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error(
        "No se pudieron cargar las estadísticas de pagos:",
        error
      )

      return {
        count: null,
        total: null,
        missingAmounts: 0,
      }
    }

    const payments = (data ?? []) as PaymentAmountRow[]

    totalCount += payments.length

    for (const payment of payments) {
      if (
        payment.amount_paid === null ||
        payment.currency_id !== "PEN" ||
        !Number.isFinite(Number(payment.amount_paid))
      ) {
        missingAmounts++
        continue
      }

      totalCents += Math.round(
        Number(payment.amount_paid) * 100
      )
    }

    if (payments.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return {
    count: totalCount,
    total: totalCents / 100,
    missingAmounts,
  }
}

export default async function AdminPage() {
  const now = new Date().toISOString()

  const [
    paymentStatistics,
    activeMembershipsResult,
    telegramServiceStateResult,
  ] = await Promise.all([
    getPaymentStatistics(),

    supabaseAdmin
      .from("memberships")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .gt("expires_at", now)
      .is("deleted_at", null),

    supabaseAdmin
      .from("telegram_service_state")
      .select(`
        id,
        maintenance,
        message,
        maintenance_started_at,
        updated_at
      `)
      .eq("id", 1)
      .single(),
  ])

  const hasSummaryError =
    paymentStatistics.count === null ||
    Boolean(activeMembershipsResult.error)

  if (activeMembershipsResult.error) {
    console.error(
      "No se pudo cargar el total de membresías activas:",
      activeMembershipsResult.error
    )
  }

  if (telegramServiceStateResult.error) {
    console.error(
      "No se pudo cargar el estado de Telegram:",
      telegramServiceStateResult.error
    )
  }

  const telegramInitialState = (
    telegramServiceStateResult.data ?? {
      id: 1,
      maintenance: false,
      message:
        "The Golden Circle se encuentra temporalmente en mantenimiento.",
      maintenance_started_at: null,
      updated_at: now,
    }
  ) as TelegramServiceState

  const amountIsComplete =
    paymentStatistics.total !== null &&
    paymentStatistics.missingAmounts === 0

  const formattedAmount = amountIsComplete
    ? MONEY_FORMATTER.format(paymentStatistics.total!)
    : "—"

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

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          href="/admin/approved"
          label="Pagos aprobados"
          value={
            paymentStatistics.count === null
              ? "—"
              : String(paymentStatistics.count)
          }
          amount={formattedAmount}
          icon="payments"
        />

        <SummaryCard
          href="/admin/activated"
          label="Membresías activas"
          description="Usuarios con acceso VIP vigente."
          value={
            activeMembershipsResult.error
              ? "—"
              : String(activeMembershipsResult.count ?? 0)
          }
          icon="memberships"
        />
      </section>

      <TelegramMaintenanceCard
        initialState={telegramInitialState}
      />
    </div>
  )
}
