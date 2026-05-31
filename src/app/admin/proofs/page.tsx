import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { approveProof, rejectProof, moveProofToTrash } from "./actions"
import { ProofImagePreview } from "./proof-image-preview"

export default async function AdminProofsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/")
  }

  const { data: proofs } = await supabaseAdmin
    .from("payment_proofs")
    .select("*")
    .neq("status", "approved")
    .order("created_at", { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <section className="admin-content">
          <div>
            <h1 className="admin-title">Solicitudes</h1>
            <p className="admin-description">
              Revisa comprobantes pendientes o rechazados.
            </p>
          </div>

          <div className="admin-table-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-gold/70">
                    <th className="px-3 py-3">Correo</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Comprobante</th>
                    <th className="px-3 py-3">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {proofs?.map((proof) => (
                    <tr key={proof.id} className="bg-black/40 text-muted-foreground">
                      <td className="px-3 py-3">{proof.email}</td>

                      <td className="px-3 py-3">
                        {proof.plan === "quarterly" ? "Trimestral" : "Mensual"}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full border border-gold/20 px-3 py-1 text-xs uppercase tracking-widest text-gold">
                          {proof.status === "pending" ? "Pendiente" : "Rechazado"}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <ProofImagePreview url={proof.proof_url} />
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {proof.status === "pending" && (
                            <>
                              <form action={approveProof}>
                                <input type="hidden" name="proofId" value={proof.id} />
                                <input type="hidden" name="userId" value={proof.user_id} />
                                <input type="hidden" name="email" value={proof.email} />
                                <input type="hidden" name="plan" value={proof.plan} />

                                <button className="admin-action-button rounded-lg border border-gold/30 px-3 py-2 text-xs uppercase tracking-widest text-gold hover:bg-gold/10">
                                  Aprobar
                                </button>
                              </form>

                              <form action={rejectProof}>
                                <input type="hidden" name="proofId" value={proof.id} />
                                <input type="hidden" name="userId" value={proof.user_id} />

                                <button className="admin-action-button rounded-lg border border-red-500/30 px-3 py-2 text-xs uppercase tracking-widest text-red-300 hover:bg-red-500/10">
                                  Rechazar
                                </button>
                              </form>
                            </>
                          )}

                          <form action={moveProofToTrash}>
                            <input type="hidden" name="proofId" value={proof.id} />

                            <button className="admin-action-button rounded-lg border border-zinc-500/30 px-3 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:bg-zinc-500/10">
                              Papelera
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!proofs?.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">
                        No hay solicitudes activas.
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