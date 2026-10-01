import {
  approveProof,
  moveProofToTrash,
  rejectProof,
} from "./actions"
import {
  ProofImagePreview,
} from "./proof-image-preview"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type ProofStatus =
  | "pending"
  | "rejected"

type PaymentProof = {
  id: string
  email: string
  plan: string
  status: ProofStatus
  proof_url: string
  created_at: string
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

function formatStatus(
  status: ProofStatus
) {
  return status ===
    "pending"
    ? "Pendiente"
    : "Rechazado"
}

export default async function AdminProofsPage() {
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
          status,
          proof_url,
          created_at
        `
      )
      .in(
        "status",
        [
          "pending",
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
      "No se pudieron cargar las solicitudes de pago:",
      error
    )
  }

  const proofs =
    (
      data ?? []
    ) as PaymentProof[]

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Solicitudes de pago
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Revisa los comprobantes pendientes y los pagos rechazados.
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar las solicitudes de pago.
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-gold/20 bg-black">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gold/15 text-xs uppercase tracking-widest text-gold/70">
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
                  Estado
                </th>

                <th className="px-5 py-4 font-medium">
                  Comprobante
                </th>

                <th className="px-5 py-4 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {proofs.map(
                (proof) => (
                  <tr
                    key={proof.id}
                    className="border-b border-gold/10 last:border-b-0"
                  >
                    <td className="max-w-[280px] px-5 py-4">
                      <p
                        title={
                          proof.email
                        }
                        className="truncate text-sm text-foreground"
                      >
                        {proof.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatPlan(
                        proof.plan
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(
                        proof.created_at
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                          proof.status ===
                          "pending"
                            ? "border-gold/25 bg-gold/[0.06] text-gold"
                            : "border-red-500/25 bg-red-500/[0.06] text-red-300"
                        }`}
                      >
                        {formatStatus(
                          proof.status
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <ProofImagePreview
                        url={
                          proof.proof_url
                        }
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start justify-end gap-2">
                        {proof.status ===
                          "pending" && (
                          <>
                            <form
                              action={
                                approveProof
                              }
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
                                className="admin-action-button min-h-10 rounded-xl border border-gold/35 bg-gold/[0.06] px-4 text-xs text-gold hover:border-gold/55 hover:bg-gold/[0.11]"
                              >
                                Aprobar
                              </button>
                            </form>

                            <form
                              action={
                                rejectProof
                              }
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
                                className="admin-action-button min-h-10 rounded-xl border border-red-500/30 bg-red-500/[0.04] px-4 text-xs text-red-300 hover:border-red-500/50 hover:bg-red-500/[0.1]"
                              >
                                Rechazar
                              </button>
                            </form>
                          </>
                        )}

                        <details className="group relative">
                          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center rounded-xl border border-zinc-500/30 bg-black px-4 text-xs text-zinc-300 transition-colors hover:border-zinc-400/45 hover:bg-zinc-500/[0.08] focus-visible:border-zinc-400/55 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                            Mover a Papelera
                          </summary>

                          <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[290px] rounded-xl border border-red-500/20 bg-[#0b0706] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.72)]">
                            <p className="text-xs leading-5 text-red-200/80">
                              El comprobante desaparecerá de las solicitudes, pero podrá restaurarse desde la Papelera.
                            </p>

                            <form
                              action={
                                moveProofToTrash
                              }
                              className="mt-3"
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
                                className="min-h-10 w-full rounded-lg border border-red-500/35 bg-red-500/[0.09] px-4 text-xs font-medium text-red-300 transition-colors hover:border-red-500/55 hover:bg-red-500/[0.15] focus-visible:border-red-500/70 focus-visible:outline-none"
                              >
                                Confirmar envío
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!proofs.length &&
                !error && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay solicitudes pendientes ni rechazadas.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}