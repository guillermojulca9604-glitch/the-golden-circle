import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { deactivateMembership } from "../proofs/actions"

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-PE")
}

function getRemainingDays(expiresAt: string) {
  const now = new Date().getTime()
  const end = new Date(expiresAt).getTime()
  const diff = end - now

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default async function ActivatedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/")
  }

  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <section className="admin-content">
          <div>
            <h1 className="admin-title">Activados</h1>

            <p className="admin-description">
              Usuarios con acceso VIP activo.
            </p>
          </div>

          <div className="admin-table-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-gold/70">
                    <th className="px-3 py-3">Correo</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Inicio</th>
                    <th className="px-3 py-3">Fin</th>
                    <th className="px-3 py-3">Días</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {memberships?.map((membership) => (
                    <tr
                      key={membership.id}
                      className="bg-black/40 text-muted-foreground"
                    >
                      <td className="px-3 py-3">{membership.email}</td>

                      <td className="px-3 py-3">
                        {membership.plan === "quarterly"
                          ? "Trimestral"
                          : "Mensual"}
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(membership.starts_at)}
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(membership.expires_at)}
                      </td>

                      <td className="px-3 py-3">
                        {getRemainingDays(membership.expires_at)}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full border border-green-500/20 px-3 py-1 text-xs uppercase tracking-widest text-green-300">
                          Activo
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <form action={deactivateMembership}>
                          <input
                            type="hidden"
                            name="membershipId"
                            value={membership.id}
                          />

                          <button className="admin-action-button rounded-lg border border-zinc-500/30 px-3 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:bg-zinc-500/10">
                            Desactivar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}

                  {!memberships?.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        No hay usuarios activados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}