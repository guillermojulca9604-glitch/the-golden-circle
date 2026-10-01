import {
  activateMembership,
  moveMembershipToTrash,
} from "../proofs/actions"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type DisabledMembership = {
  id: string
  email: string
  plan: string
  expires_at: string | null
  deactivated_reason: string | null
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

export default async function DisabledPage() {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("memberships")
      .select(
        `
          id,
          email,
          plan,
          expires_at,
          deactivated_reason
        `
      )
      .eq(
        "status",
        "disabled"
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "deactivated_at",
        {
          ascending: false,
          nullsFirst: false,
        }
      )

  if (error) {
    console.error(
      "No se pudieron cargar los VIP vencidos:",
      error
    )
  }

  const memberships =
    (
      data ?? []
    ) as DisabledMembership[]

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          VIP vencidos
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Membresías que finalizaron
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar las membresías vencidas.
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
                  Finalización
                </th>

                <th className="px-5 py-4 font-medium">
                  Motivo
                </th>

                <th className="px-5 py-4 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {memberships.map(
                (membership) => (
                  <tr
                    key={
                      membership.id
                    }
                    className="border-b border-gold/10 last:border-b-0"
                  >
                    <td className="max-w-[280px] px-5 py-4">
                      <p
                        title={
                          membership.email
                        }
                        className="truncate text-sm text-foreground"
                      >
                        {
                          membership.email
                        }
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatPlan(
                        membership.plan
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(
                        membership.expires_at
                      )}
                    </td>

                    <td className="max-w-[280px] px-5 py-4">
                      <p
                        title={
                          membership.deactivated_reason ??
                          "Finalizada"
                        }
                        className="truncate text-sm text-muted-foreground"
                      >
                        {
                          membership.deactivated_reason ??
                          "Finalizada"
                        }
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start justify-end gap-2">
                        <form
                          action={
                            activateMembership
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
                            className="admin-action-button min-h-10 rounded-xl border border-gold/30 bg-black px-4 text-xs text-gold hover:border-gold/50 hover:bg-gold/10"
                          >
                            Activar
                          </button>
                        </form>

                        <details className="group relative">
                          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center rounded-xl border border-red-500/25 bg-red-500/[0.035] px-4 text-xs text-red-300 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.08] focus-visible:border-red-500/60 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                            Mover a Papelera
                          </summary>

                          <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[290px] rounded-xl border border-red-500/20 bg-[#0b0706] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.72)]">
                            <p className="text-xs leading-5 text-red-200/80">
                              La membresía desaparecerá de VIP vencidos, pero podrá restaurarse desde la Papelera.
                            </p>

                            <form
                              action={
                                moveMembershipToTrash
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

              {!memberships.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay VIP vencidos.
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