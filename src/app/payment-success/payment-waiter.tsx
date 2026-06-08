"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type Props = {
  paymentId: string
}

export function PaymentWaiter({ paymentId }: Props) {
  const [seconds, setSeconds] = useState(0)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    let attempts = 0
    let cancelled = false

    const finish = () => {
      localStorage.setItem("tgc_payment_active", String(Date.now()))

      window.opener?.postMessage(
        { type: "TGC_PAYMENT_ACTIVE" },
        window.location.origin
      )

      window.location.replace("/vip")
    }

    const check = async () => {
      if (cancelled) return

      attempts++

      try {
        if (paymentId) {
          await fetch(`/api/mercadopago/confirm-payment?payment_id=${paymentId}`, {
            cache: "no-store",
          })
        }

        const response = await fetch("/api/membership/status", {
          cache: "no-store",
        })

        const data = await response.json()

        if (data.active) {
          finish()
          return
        }
      } catch {}

      setSeconds(attempts)

      if (attempts < 20) {
        setTimeout(check, 1000)
      } else {
        setShowButton(true)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [paymentId])

  return (
    <>
      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        Validando acceso automáticamente... {seconds}s
      </p>

      {showButton && (
        <Link
          href="/vip"
          className="telegram-button subscription-premium-button mt-6 inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em]"
        >
          Ir a VIP
        </Link>
      )}
    </>
  )
}