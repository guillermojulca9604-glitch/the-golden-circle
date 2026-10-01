import {
  deactivateMembership,
} from "../proofs/actions"

import {
  supabaseAdmin,
} from "@/lib/supabase/admin"

export const dynamic =
  "force-dynamic"

type MembershipRow = {
  id: string
  email: string
  plan: string
  starts_at: string | null
  expires_at: string | null
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

function getRemainingDays(
  expiresAt: string | null
) {
  if (!expiresAt) {
    return 0
  }

  const expirationTime =
    new Date(
      expiresAt
    ).getTime()

  if (
    Number.isNaN(
      expirationTime
    )
  ) {
    return 0
  }

  const difference =
    expirationTime -
    Date.now()

  return Math.max(
    0,
    Math.ceil(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        )
    )
  )
}

export default async function ActivatedPage() {
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
          starts_at,
          expires_at
        `
      )
      .eq(
        "status",
        "active"
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
      "No se pudieron cargar las membresías activas:",
      error
    )
  }

  const memberships =
    (
      data ?? []
    ) as MembershipRow[]

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="pr-14 sm:pr-16">
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Membresías activas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Usuarios con acceso VIP
        </p>
      </section>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          No se pudieron cargar las membresías activas.
        </div>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-gold/20 bg-black">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gold/15 text-xs uppercase tracking-widest text-gold/70">
                <th className="px-5 py-4 font-medium">
                  Correo
                </th>

                <th className="px-5 py-4 font-medium">
                  Plan
                </th>

                <th className="px-5 py-4 font-medium">
                  Inicio
                </th>

                <th className="px-5 py-4 font-medium">
                  Vencimiento
                </th>

                <th className="px-5 py-4 font-medium">
                  Días restantes
                </th>

                <th className="px-5 py-4 font-medium">
                  Estado
                </th>

                <th className="px-5 py-4 font-medium">
                  Acción
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
                        membership.starts_at
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {formatDate(
                        membership.expires_at
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {getRemainingDays(
                        membership.expires_at
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-green-500/25 bg-green-500/[0.06] px-3 py-1 text-xs text-green-300">
                        Activo
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <form
                        action={
                          deactivateMembership
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
                          className="admin-action-button rounded-xl border border-zinc-500/30 bg-black px-4 py-2 text-xs text-zinc-300 hover:border-zinc-400/40 hover:bg-zinc-500/10"
                        >
                          Desactivar
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              )}

              {!memberships.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay membresías activas.
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