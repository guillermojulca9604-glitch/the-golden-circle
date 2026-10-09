
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PaymentsTrashTable } from "./payments-table"

import type {
  PaymentInTrash,
} from "./payments-table"

export const dynamic = "force-dynamic"

type PaymentRow = {
  id: string
  email: string
  plan: string
  created_at: string
  admin_trashed_at: string
  amount_paid: number | null
  currency_id: string | null
}

const RETENTION_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

const DATE_FORMATTER = new Intl.DateTimeFormat(
  "es-PE",
  {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }
)

const MONEY_FORMATTER = new Intl.NumberFormat(
  "es-PE",
  {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }
)

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return DATE_FORMATTER.format(date)
}

function formatPlan(plan: string) {
  if (plan === "monthly") {
    return "Mensual"
  }

  if (plan === "quarterly") {
    return "Trimestral"
  }

  return plan
}

function formatAmount(
  amount: number | null,
  currency: string | null
) {
  if (
    amount === null ||
    currency !== "PEN" ||
    !Number.isFinite(Number(amount))
  ) {
    return "Pendiente"
  }

  return MONEY_FORMATTER.format(Number(amount))
}

function getRemainingDays(
  trashedAt: string,
  now: number
) {
  const trashedTime = new Date(trashedAt).getTime()

  if (!Number.isFinite(trashedTime)) {
    return 0
  }

  const expirationTime =
    trashedTime + RETENTION_DAYS * DAY_MS

  return Math.max(
    0,
    Math.ceil((expirationTime - now) / DAY_MS)
  )
}

export default async function TrashPage() {
  const now = Date.now()

  const cutoff = new Date(
    now - RETENTION_DAYS * DAY_MS
  ).toISOString()

  /*
   * La Papelera recibe únicamente
   * los pagos aprobados retirados
   * desde el historial.
   *
   * Los registros financieros
   * permanecen en Supabase.
   */
  const { data, error } = await supabaseAdmin
    .from("payment_attempts")
    .select(`
      id,
      email,
      plan,
      created_at,
      admin_trashed_at,
      amount_paid,
      currency_id
    `)
    .eq("status", "approved")
    .not("admin_trashed_at", "is", null)
    .gt("admin_trashed_at", cutoff)
    .order("admin_trashed_at", {
      ascending: false,
    })

  if (error) {
    console.error(
      "No se pudieron cargar los pagos de Papelera:",
      error
    )
  }

  const rows = (data ?? []) as PaymentRow[]

  const payments: PaymentInTrash[] = rows.map(
    (payment) => ({
      id: payment.id,
      email: payment.email,
      plan: formatPlan(payment.plan),
      amount: formatAmount(
        payment.amount_paid,
        payment.currency_id
      ),
      paymentDate: formatDate(
        payment.created_at
      ),
      trashedDate: formatDate(
        payment.admin_trashed_at
      ),
      remainingDays: getRemainingDays(
        payment.admin_trashed_at,
        now
      ),
    })
  )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Papelera
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Pagos aprobados retirados del historial.
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar los pagos de Papelera.
        </div>
      )}

      {!error && (
        <section className="mt-7">
          <PaymentsTrashTable payments={payments} />
        </section>
      )}
    </div>
  )
}
