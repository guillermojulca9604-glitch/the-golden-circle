"use client"

import { useEffect, useState } from "react"

export function PaymentWaiter() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let attempts = 0
    let cancelled = false

    const notifyCheckoutAndClose = () => {
      window.opener?.postMessage(
        { type: "TGC_PAYMENT_ACTIVE" },
        window.location.origin
      )

      setTimeout(() => {
        window.close()
        window.location.replace("/vip")
      }, 600)
    }

    const checkMembership = async () => {
      if (cancelled) return

      attempts++

      try {
        const response = await fetch("/api/membership/status", {
          cache: "no-store",
        })

        const data = await response.json()

        if (data.active) {
          notifyCheckoutAndClose()
          return
        }
      } catch {}

      setSeconds(attempts)

      if (attempts < 30) {
        setTimeout(checkMembership, 1000)
      }
    }

    checkMembership()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Validando acceso automáticamente... {seconds}s
    </p>
  )
}