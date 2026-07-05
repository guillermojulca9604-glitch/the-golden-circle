import { redirect } from "next/navigation"
import { VipAccountMenu } from "@/components/vip-account-menu"
import { createClient } from "@/lib/supabase/server"

export default async function VipPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/access?step=login")
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
    redirect("/access?step=pricing")
  }

  const expiresAt = new Date(membership.expires_at).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <VipAccountMenu email={user.email} />

      <section className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="pricing-label mb-5 block">The Golden Circle</span>

          <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
            Panel VIP
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
            Bienvenido al espacio privado. Tu membresía está activa.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Estado
            </p>

            <h2 className="mt-4 text-3xl font-light text-gold">
              Activo
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Tu cuenta tiene acceso privado habilitado.
            </p>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Plan
            </p>

            <h2 className="mt-4 text-3xl font-light">
              {membership.plan === "quarterly" ? "Trimestral" : "Mensual"}
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Membresía actual de The Golden Circle.
            </p>
          </div>

          <div className="checkout-premium-card rounded-[34px] bg-black p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">
              Vigencia
            </p>

            <h2 className="mt-4 text-3xl font-light">
              {expiresAt}
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Al vencer, volverás a la pantalla de suscripción.
            </p>
          </div>
        </div>

        <div className="checkout-premium-card mt-8 rounded-[34px] bg-black p-8">
          <h2 className="text-3xl font-light">
            Colección privada
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Este será el espacio principal del contenido VIP. Aquí colocaremos
            categorías, colecciones, imágenes, videos o enlaces privados.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {["Contenido 01", "Contenido 02", "Contenido 03"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gold/15 bg-black/40 p-6"
              >
                <p className="text-gold">{item}</p>

                <p className="mt-3 text-sm text-muted-foreground">
                  Espacio reservado para contenido exclusivo.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}