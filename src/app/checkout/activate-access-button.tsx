"use client"

import { useRef, useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const paymentWindowRef = useRef<Window | null>(null)
  const [waiting, setWaiting] = useState(false)

  const checkMembership = async () => {
    const response = await fetch("/api/membership/status", {
      cache: "no-store",
    })

    if (!response.ok) return false

    const data = await response.json()
    return Boolean(data.active)
  }

  const startWatching = () => {
    const interval = window.setInterval(async () => {
      const isActive = await checkMembership()

      if (isActive) {
        window.clearInterval(interval)
        window.location.replace("/vip")
        return
      }

      if (paymentWindowRef.current?.closed) {
        window.clearInterval(interval)

        setTimeout(async () => {
          const activeAfterClose = await checkMembership()

          if (activeAfterClose) {
            window.location.replace("/vip")
          } else {
            window.location.replace("/pricing")
          }
        }, 1500)
      }
    }, 1000)
  }

  const handleClick = async () => {
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
      const popup = window.open(data.url, "_blank", "noopener,noreferrer")

      if (!popup) {
        window.location.href = data.url
        return
      }

      paymentWindowRef.current = popup
      setWaiting(true)
      startWatching()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
      >
        Activar acceso
      </button>

      {waiting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-6 text-center backdrop-blur-md">
          <div className="checkout-premium-card max-w-xl rounded-[34px] bg-black p-8">
            <span className="pricing-label mb-4 block">
              Verificación
            </span>

            <h2 className="checkout-premium-title mb-4 text-4xl font-light">
              Validando acceso
            </h2>

            <p className="text-sm leading-7 text-muted-foreground">
              Completa el pago en la ventana abierta. Si el pago se confirma, ingresarás automáticamente al contenido VIP.
            </p>
          </div>
        </div>
      )}
    </>
  )
}