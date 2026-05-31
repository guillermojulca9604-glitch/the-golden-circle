import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { activateMembership } from "../proofs/actions"

function formatDate(date: string | null) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("es-PE")
}

export default async function DisabledPage() {
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
    .eq("status", "disabled")
    .order("deactivated_at", { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <section className="admin-content">
          <div>
            <h1 className="admin-title">Desactivados</h1>

            <p className="admin-description">
              Usuarios sin acceso VIP por vencimiento o desactivación manual.
            </p>
          </div>

          <div className="admin-table-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-gold/70">
                    <th className="px-3 py-3">Correo</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Fin</th>
                    <th className="px-3 py-3">Motivo</th>
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
                        {formatDate(membership.expires_at)}
                      </td>

                      <td className="px-3 py-3">
                        {membership.deactivated_reason ?? "Manual"}
                      </td>

                      <td className="px-3 py-3">
                        <form action={activateMembership}>
                          <input
                            type="hidden"
                            name="membershipId"
                            value={membership.id}
                          />

                          <button className="admin-action-button rounded-lg border border-gold/30 px-3 py-2 text-xs uppercase tracking-widest text-gold hover:bg-gold/10">
                            Activar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}

                  {!memberships?.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        No hay usuarios desactivados.
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