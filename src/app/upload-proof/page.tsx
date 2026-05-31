import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UploadProofForm } from "./upload-proof-form"
import { ProofStatusWatcher } from "./proof-status-watcher"

type Props = {
  searchParams: Promise<{
    plan?: string
    country?: string
  }>
}

export default async function UploadProofPage({ searchParams }: Props) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/upload-proof?plan=${params.plan ?? "monthly"}&country=${params.country ?? "pe"}`)
  }

  const { data: latestProof } = await supabase
    .from("payment_proofs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const status = latestProof?.status ?? "none"
  const isPending = status === "pending"
  const isRejected = status === "rejected"
  const isApproved = status === "approved"

  if (isApproved) {
    redirect("/vip")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <ProofStatusWatcher status={status} />

      <section className="mx-auto max-w-xl">
        <div className="featured-card checkout-premium-card rounded-[34px] bg-black p-8 text-center">
          <span className="pricing-label mb-4 block">Comprobante</span>

          <h1 className="checkout-premium-title mb-4 text-5xl font-light">
            {isPending ? "En verificación" : "Validar pago"}
          </h1>

          {isPending ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">
                Tu comprobante ya fue enviado y está siendo revisado. Esta página se actualizará automáticamente.
              </p>

              <div className="rounded-2xl border border-gold/20 bg-black/40 p-5">
                <p className="checkout-premium-label text-xs uppercase tracking-widest">
                  Estado
                </p>

                <p className="checkout-premium-text mt-3 text-2xl">
                  Pendiente
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-8 text-sm text-muted-foreground">
                {isRejected
                  ? "Tu comprobante anterior fue rechazado. Puedes subir uno nuevo."
                  : "Sube tu comprobante de pago. Será revisado para activar tu acceso VIP."}
              </p>

              <UploadProofForm />
            </>
          )}
        </div>
      </section>
    </main>
  )
}