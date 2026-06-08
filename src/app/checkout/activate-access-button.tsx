"use client"

import { useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [waiting, setWaiting] = useState(false)

  const handleClick = async () => {
    if (waiting) return

    setWaiting(true)

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      })

      if (response.status === 401) {
        window.location.href = `/login?next=/checkout?plan=${plan}&country=pe`
        return
      }

      const data = await response.json()

      if (data?.url === "/vip") {
        window.location.replace("/vip")
        return
      }

      if (data?.url) {
        window.location.href = data.url
        return
      }

      setWaiting(false)
    } catch {
      setWaiting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={waiting}
        className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-80"
      >
        Activar acceso
      </button>

      {waiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 text-center backdrop-blur-sm">
          <div className="relative max-w-xl rounded-[34px] border border-gold/40 bg-black p-8 shadow-[0_0_45px_rgba(212,175,55,0.16)]">
            <div className="pointer-events-none absolute inset-0 rounded-[34px] border border-white/5" />

            <span className="pricing-label mb-4 block">Redirección segura</span>

            <h2 className="checkout-premium-title mb-4 text-4xl font-light">
              Abriendo Mercado Pago
            </h2>

            <p className="text-sm leading-7 text-muted-foreground">
              Serás redirigido para completar el pago de forma segura.
            </p>
          </div>
        </div>
      )}
    </>
  )
}