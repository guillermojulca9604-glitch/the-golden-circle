import Link from "next/link"

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      <section className="mx-auto max-w-xl text-center">
        <div className="featured-card checkout-premium-card rounded-[34px] bg-black p-8">
          <span className="pricing-label mb-4 block">
            Mercado Pago
          </span>

          <h1 className="checkout-premium-title mb-4 text-5xl font-light">
            Pago en proceso
          </h1>

          <p className="text-sm leading-7 text-muted-foreground">
            Tu pago fue enviado mediante Mercado Pago. La activación del acceso VIP se realizará cuando la pasarela confirme la operación.
          </p>

          <Link
            href="/vip"
            className="telegram-button subscription-premium-button mt-8 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em]"
          >
            Ir a VIP
          </Link>
        </div>
      </section>
    </main>
  )
}