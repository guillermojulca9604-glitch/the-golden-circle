import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ProofImagePreview } from "../proofs/proof-image-preview"
import { moveProofToTrash } from "../proofs/actions"

export default async function ApprovedPage() {
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
    .eq("status", "approved")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  return (
    <main className="admin-page">
      <div className="admin-layout">
        <AdminSidebar />

        <section className="admin-content">
          <div>
            <h1 className="admin-title">Aprobados</h1>

            <p className="admin-description">
              Membresías activadas correctamente.
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
                    <tr
                      key={proof.id}
                      className="bg-black/40 text-muted-foreground"
                    >
                      <td className="px-3 py-3">
                        {proof.email}
                      </td>

                      <td className="px-3 py-3">
                        {proof.plan === "quarterly"
                          ? "Trimestral"
                          : "Mensual"}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full border border-green-500/20 px-3 py-1 text-xs uppercase tracking-widest text-green-300">
                          Aprobado
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <ProofImagePreview url={proof.proof_url} />
                      </td>

                      <td className="px-3 py-3">
                        <form action={moveProofToTrash}>
                          <input
                            type="hidden"
                            name="proofId"
                            value={proof.id}
                          />

                          <button className="admin-action-button rounded-lg border border-zinc-500/30 px-3 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:bg-zinc-500/10">
                            Papelera
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}

                  {!proofs?.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        No hay aprobados.
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