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
      <section className="mx-auto max-w-4xl text-center">
        <span className="pricing-label mb-4 block">
          The Golden Circle
        </span>

        <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
          Acceso VIP
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
          Tu membresía está activa. Bienvenido al contenido privado.
        </p>

        <div className="checkout-premium-card mt-12 rounded-[34px] bg-black p-8">
          <p className="text-gold">
            Contenido exclusivo activo
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Plan: {membership.plan}
          </p>
        </div>
      </section>
    </main>
  )
}