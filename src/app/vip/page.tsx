import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function VipPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/vip")
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, plan, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect("/pricing")
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <section className="mx-auto flex min-h-[calc(100dvh-160px)] max-w-4xl items-center justify-center text-center">
        <div className="checkout-premium-card w-full rounded-[34px] bg-black p-8 md:p-12">
          <span className="pricing-label mb-5 block">
            The Golden Circle
          </span>

          <h1 className="checkout-premium-title text-5xl font-light leading-none md:text-7xl">
            Acceso VIP activado
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
            Tu membresía está activa. Bienvenido al espacio privado de The Golden Circle.
          </p>

          <div className="mt-10 rounded-2xl border border-gold/20 bg-black/50 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Estado
            </p>

            <p className="mt-3 text-2xl text-gold">
              Membresía activa
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              Plan: {membership.plan === "quarterly" ? "Trimestral" : "Mensual"}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}