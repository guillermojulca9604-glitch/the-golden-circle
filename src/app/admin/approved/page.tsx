
import { supabaseAdmin } from "@/lib/supabase/admin"
import { movePaymentToTrash } from "./actions"

export const dynamic = "force-dynamic"

type Payment = {
  id: string
  email: string
  plan: string
  created_at: string
}

type MonthGroup = {
  key: string
  label: string
  payments: Payment[]
}

type YearGroup = {
  year: string
  months: MonthGroup[]
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
})

const MONTH_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  timeZone: "America/Lima",
})

const GROUP_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
})

const MONEY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: true,
})

function formatPlan(plan: string) {
  if (plan === "monthly") return "Mensual"
  if (plan === "quarterly") return "Trimestral"
  return plan
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return DATE_FORMATTER.format(date)
}

function getPlanAmount(plan: string): number | null {
  if (plan === "monthly") return 30
  if (plan === "quarterly") return 80

  return null
}

function formatAmount(plan: string) {
  const amount = getPlanAmount(plan)

  if (amount === null) return "—"

  return MONEY_FORMATTER.format(amount)
}

function getDateGroup(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return {
      year: "Sin fecha",
      key: "sin-fecha",
      label: "Sin fecha",
    }
  }

  const parts = GROUP_FORMATTER.formatToParts(date)

  const year =
    parts.find((part) => part.type === "year")?.value ??
    "Sin fecha"

  const month =
    parts.find((part) => part.type === "month")?.value ??
    "00"

  const monthName = MONTH_FORMATTER.format(date)

  return {
    year,
    key: `${year}-${month}`,
    label:
      monthName.charAt(0).toUpperCase() +
      monthName.slice(1),
  }
}

function groupPayments(payments: Payment[]): YearGroup[] {
  const years = new Map<string, Map<string, MonthGroup>>()

  for (const payment of payments) {
    const group = getDateGroup(payment.created_at)

    if (!years.has(group.year)) {
      years.set(group.year, new Map())
    }

    const months = years.get(group.year)!

    if (!months.has(group.key)) {
      months.set(group.key, {
        key: group.key,
        label: group.label,
        payments: [],
      })
    }

    months.get(group.key)!.payments.push(payment)
  }

  return Array.from(years.entries()).map(
    ([year, months]) => ({
      year,
      months: Array.from(months.values()),
    })
  )
}

export default async function ApprovedPage() {
  const { data, error } = await supabaseAdmin
    .from("payment_attempts")
    .select(`
      id,
      email,
      plan,
      created_at
    `)
    .eq("status", "approved")
    .is("admin_trashed_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error(
      "No se pudieron cargar los pagos aprobados:",
      error
    )
  }

  const payments = (data ?? []) as Payment[]
  const groupedPayments = groupPayments(payments)

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Pagos aprobados
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Historial de pagos registrados por Mercado Pago
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar los pagos aprobados.
        </div>
      )}

      <div className="mt-7 space-y-10">
        {groupedPayments.map((yearGroup) => (
          <section key={yearGroup.year}>
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-2xl text-gold">
                {yearGroup.year}
              </h2>

              <div
                aria-hidden="true"
                className="h-px flex-1 bg-gradient-to-r from-gold/25 to-transparent"
              />
            </div>

            <div className="mt-5 space-y-5">
              {yearGroup.months.map((monthGroup) => (
                <article
                  key={monthGroup.key}
                  className="overflow-hidden rounded-2xl border border-gold/20 bg-black"
                >
                  <header className="border-b border-gold/15 px-4 py-4 sm:px-5">
                    <h3 className="text-base font-medium text-foreground">
                      {monthGroup.label}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {monthGroup.payments.length}{" "}
                      {monthGroup.payments.length === 1
                        ? "pago aprobado"
                        : "pagos aprobados"}
                    </p>
                  </header>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gold/10 text-[11px] uppercase tracking-widest text-gold/60">
                          <th className="px-5 py-4 font-medium">
                            Correo
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Plan
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Fecha
                          </th>

                          <th className="px-5 py-4 font-medium">
                            Monto
                          </th>

                          <th className="px-5 py-4 text-right font-medium">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {monthGroup.payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-gold/10 last:border-b-0"
                          >
                            <td className="max-w-[270px] px-5 py-4">
                              <p
                                title={payment.email}
                                className="truncate text-sm text-foreground"
                              >
                                {payment.email}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-muted-foreground">
                              {formatPlan(payment.plan)}
                            </td>

                            <td className="px-5 py-4 text-sm text-muted-foreground">
                              {formatDate(payment.created_at)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gold">
                              {formatAmount(payment.plan)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <form action={movePaymentToTrash}>
                                <input
                                  type="hidden"
                                  name="paymentId"
                                  value={payment.id}
                                />

                                <button
                                  type="submit"
                                  className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-red-500/25 px-3 text-xs text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/[0.05]"
                                >
                                  Mover a Papelera
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {!error && payments.length === 0 && (
          <div className="rounded-2xl border border-gold/20 bg-black px-5 py-10 text-center text-sm text-muted-foreground">
            No hay pagos aprobados visibles.
          </div>
        )}
      </div>
    </div>
  )
}
