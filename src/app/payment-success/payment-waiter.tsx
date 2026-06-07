"use client"

import { useEffect, useState } from "react"

type Props = {
  paymentId: string
}

export function PaymentWaiter({ paymentId }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let attempts = 0
    let cancelled = false

    const notifyAndClose = () => {
      localStorage.setItem("tgc_payment_active", String(Date.now()))

      window.opener?.postMessage(
        { type: "TGC_PAYMENT_ACTIVE" },
        window.location.origin
      )

      setTimeout(() => {
        window.close()
        window.location.replace("/vip")
      }, 500)
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
          notifyAndClose()
          return
        }
      } catch {}

      setSeconds(attempts)

      if (attempts < 30) {
        setTimeout(check, 1000)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [paymentId])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Validando acceso automáticamente... {seconds}s
    </p>
  )
}