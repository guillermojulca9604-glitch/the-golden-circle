import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function VipPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/vip&source=header")
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect("/pricing")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <div className="mx-auto max-w-6xl">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold">
          Zona privada
        </span>

        <h1 className="mb-8 text-5xl font-light">VIP</h1>

        <div className="featured-card rounded-3xl bg-black p-8">
          <p className="text-muted-foreground">
            Aquí colocarás tus videos y contenido privado.
          </p>

          <div className="mt-8 rounded-2xl border border-gold/15 bg-black/40 p-5">
            <p className="checkout-premium-label text-xs uppercase tracking-widest">
              Membresía activa
            </p>

            <p className="checkout-premium-text mt-3 text-2xl">
              {membership.plan === "quarterly"
                ? "Trimestral"
                : "Mensual"}
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              Acceso válido hasta:
            </p>

            <p className="mt-2 text-gold">
              {new Date(membership.expires_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}