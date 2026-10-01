import {
  moveProofsToTrash,
  moveProofToTrash,
} from "../proofs/actions"
import {
  ProofImagePreview,
} from "../proofs/proof-image-preview"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type ApprovedProof = {
  id: string
  email: string
  plan: string
  proof_url: string
  created_at: string
}

type MonthGroup = {
  key: string
  label: string
  proofs: ApprovedProof[]
}

type YearGroup = {
  year: string
  months: MonthGroup[]
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

const MONTH_FORMATTER =
  new Intl.DateTimeFormat(
    "es-PE",
    {
      month: "long",
      timeZone:
        "America/Lima",
    }
  )

const GROUP_FORMATTER =
  new Intl.DateTimeFormat(
    "es-PE",
    {
      year: "numeric",
      month: "2-digit",
      timeZone:
        "America/Lima",
    }
  )

function formatPlan(
  plan: string
) {
  return plan ===
    "quarterly"
    ? "Trimestral"
    : "Mensual"
}

function formatDate(
  value: string
) {
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

function capitalizeFirst(
  value: string
) {
  if (!value) {
    return value
  }

  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  )
}

function getDateGroup(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      year: "Sin fecha",
      monthKey:
        "sin-fecha",
      monthLabel:
        "Sin fecha",
    }
  }

  const parts =
    GROUP_FORMATTER
      .formatToParts(date)

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "Sin fecha"

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "00"

  const monthLabel =
    capitalizeFirst(
      MONTH_FORMATTER
        .format(date)
    )

  return {
    year,
    monthKey:
      `${year}-${month}`,
    monthLabel,
  }
}

function groupProofs(
  proofs: ApprovedProof[]
) {
  const years =
    new Map<
      string,
      Map<
        string,
        MonthGroup
      >
    >()

  for (
    const proof of proofs
  ) {
    const {
      year,
      monthKey,
      monthLabel,
    } =
      getDateGroup(
        proof.created_at
      )

    let months =
      years.get(year)

    if (!months) {
      months =
        new Map<
          string,
          MonthGroup
        >()

      years.set(
        year,
        months
      )
    }

    let monthGroup =
      months.get(
        monthKey
      )

    if (!monthGroup) {
      monthGroup = {
        key: monthKey,
        label:
          monthLabel,
        proofs: [],
      }

      months.set(
        monthKey,
        monthGroup
      )
    }

    monthGroup
      .proofs
      .push(proof)
  }

  return Array.from(
    years.entries()
  ).map(
    ([
      year,
      months,
    ]): YearGroup => ({
      year,
      months:
        Array.from(
          months.values()
        ),
    })
  )
}

export default async function ApprovedPage() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "payment_proofs"
      )
      .select(
        `
          id,
          email,
          plan,
          proof_url,
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

  if (error) {
    console.error(
      "No se pudieron cargar los pagos aprobados:",
      error
    )
  }

  const proofs =
    (
      data ?? []
    ) as ApprovedProof[]

  const groupedProofs =
    groupProofs(proofs)

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Pagos aprobados
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Historial de pagos confirmados
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar los pagos aprobados.
        </div>
      )}

      <div className="mt-7 space-y-10">
        {groupedProofs.map(
          (yearGroup) => (
            <section
              key={
                yearGroup.year
              }
            >
              <div className="flex items-center gap-4">
                <h2 className="font-serif text-2xl text-gold">
                  {
                    yearGroup.year
                  }
                </h2>

                <div
                  aria-hidden="true"
                  className="h-px flex-1 bg-gradient-to-r from-gold/25 to-transparent"
                />
              </div>

              <div className="mt-5 space-y-5">
                {yearGroup
                  .months
                  .map(
                    (
                      monthGroup
                    ) => (
                      <article
                        key={
                          monthGroup.key
                        }
                        className="overflow-hidden rounded-2xl border border-gold/20 bg-black"
                      >
                        <header className="flex flex-col gap-4 border-b border-gold/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                          <div>
                            <h3 className="text-base font-medium text-foreground">
                              {
                                monthGroup.label
                              }
                            </h3>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                monthGroup
                                  .proofs
                                  .length
                              }{" "}
                              {monthGroup
                                .proofs
                                .length ===
                              1
                                ? "pago aprobado"
                                : "pagos aprobados"}
                            </p>
                          </div>

                          <details className="group relative">
                            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center rounded-xl border border-red-500/25 bg-red-500/[0.035] px-4 text-xs text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/[0.07] focus-visible:border-red-500/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                              Mover mes a Papelera
                            </summary>

                            <div className="mt-2 rounded-xl border border-red-500/20 bg-[#0b0706] p-3 sm:absolute sm:right-0 sm:top-full sm:z-20 sm:w-[290px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                              <p className="text-xs leading-5 text-red-200/80">
                                Los pagos de este mes dejarán de aparecer aquí, pero podrán restaurarse desde la Papelera.
                              </p>

                              <form
                                action={
                                  moveProofsToTrash
                                }
                                className="mt-3"
                              >
                                {monthGroup
                                  .proofs
                                  .map(
                                    (
                                      proof
                                    ) => (
                                      <input
                                        key={
                                          proof.id
                                        }
                                        type="hidden"
                                        name="proofId"
                                        value={
                                          proof.id
                                        }
                                      />
                                    )
                                  )}

                                <button
                                  type="submit"
                                  className="min-h-10 w-full rounded-lg border border-red-500/35 bg-red-500/[0.09] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/55 hover:bg-red-500/[0.15] focus-visible:border-red-500/70 focus-visible:outline-none"
                                >
                                  Confirmar envío del mes
                                </button>
                              </form>
                            </div>
                          </details>
                        </header>

                        <div className="hidden grid-cols-12 gap-4 border-b border-gold/10 px-5 py-3 text-[11px] uppercase tracking-widest text-gold/60 md:grid">
                          <div className="col-span-4">
                            Correo
                          </div>

                          <div className="col-span-2">
                            Plan
                          </div>

                          <div className="col-span-2">
                            Fecha
                          </div>

                          <div className="col-span-2">
                            Comprobante
                          </div>

                          <div className="col-span-2 text-right">
                            Acción
                          </div>
                        </div>

                        <div>
                          {monthGroup
                            .proofs
                            .map(
                              (
                                proof
                              ) => (
                                <div
                                  key={
                                    proof.id
                                  }
                                  className="grid gap-4 border-b border-gold/10 px-4 py-5 last:border-b-0 md:grid-cols-12 md:items-center md:px-5"
                                >
                                  <div className="min-w-0 md:col-span-4">
                                    <p className="mb-1 text-[10px] uppercase tracking-widest text-gold/55 md:hidden">
                                      Correo
                                    </p>

                                    <p
                                      title={
                                        proof.email
                                      }
                                      className="truncate text-sm text-foreground"
                                    >
                                      {
                                        proof.email
                                      }
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 md:contents">
                                    <div className="md:col-span-2">
                                      <p className="mb-1 text-[10px] uppercase tracking-widest text-gold/55 md:hidden">
                                        Plan
                                      </p>

                                      <p className="text-sm text-muted-foreground">
                                        {formatPlan(
                                          proof.plan
                                        )}
                                      </p>
                                    </div>

                                    <div className="md:col-span-2">
                                      <p className="mb-1 text-[10px] uppercase tracking-widest text-gold/55 md:hidden">
                                        Fecha
                                      </p>

                                      <p className="text-sm text-muted-foreground">
                                        {formatDate(
                                          proof.created_at
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="md:col-span-2">
                                    <p className="mb-2 text-[10px] uppercase tracking-widest text-gold/55 md:hidden">
                                      Comprobante
                                    </p>

                                    <ProofImagePreview
                                      url={
                                        proof.proof_url
                                      }
                                    />
                                  </div>

                                  <div className="md:col-span-2 md:flex md:justify-end">
                                    <form
                                      action={
                                        moveProofToTrash
                                      }
                                      className="w-full md:w-auto"
                                    >
                                      <input
                                        type="hidden"
                                        name="proofId"
                                        value={
                                          proof.id
                                        }
                                      />

                                      <button
                                        type="submit"
                                        className="min-h-10 w-full rounded-xl border border-red-500/25 bg-red-500/[0.035] px-4 text-xs text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.08] focus-visible:border-red-500/60 focus-visible:outline-none md:w-auto"
                                      >
                                        Mover a Papelera
                                      </button>
                                    </form>
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      </article>
                    )
                  )}
              </div>
            </section>
          )
        )}

        {!proofs.length &&
          !error && (
            <div className="rounded-2xl border border-gold/15 bg-black px-5 py-8 text-center text-sm text-muted-foreground">
              No hay pagos aprobados.
            </div>
          )}
      </div>
    </div>
  )
}