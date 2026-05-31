import Link from "next/link"
import { headers } from "next/headers"
import { PRICES } from "@/lib/pricing"

type Props = {
  searchParams: Promise<{
    country?: string
  }>
}

export default async function PricingPage({ searchParams }: Props) {
  const params = await searchParams
  const headerList = await headers()

  const countryFromIp =
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    "PE"

  const isPeru =
    params.country === "pe" ||
    countryFromIp === "PE"

  const pricing = isPeru
    ? PRICES.peru
    : PRICES.international

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <section className="mx-auto max-w-6xl text-center">
        <span className="pricing-label mb-4 block">
          Membresía privada
        </span>

        <h1 className="pricing-title mb-6">
          The Golden Circle
        </h1>

        <p className="mx-auto mb-16 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Accede al contenido VIP, material exclusivo y futuras actualizaciones privadas.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {Object.entries(pricing).map(([id, plan]) => (
            <div
              key={id}
              className="featured-card checkout-premium-card rounded-[34px] bg-black p-8"
            >
              <p className="checkout-premium-label text-xs uppercase tracking-widest">
                Membresía
              </p>

              <h2 className="checkout-premium-text mt-4 text-4xl">
                {plan.label}
              </h2>

              <div className="checkout-premium-price mt-8 text-6xl font-light">
                {plan.price}
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                {id === "monthly"
                  ? "Acceso privado durante 1 mes."
                  : "Acceso privado durante 3 meses."}
              </p>

              <Link
                href={`/checkout?plan=${id}&country=${isPeru ? "pe" : "intl"}`}
                className="telegram-button subscription-premium-button mt-10 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em]"
              >
                Continuar
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}