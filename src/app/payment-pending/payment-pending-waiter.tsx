"use client"

import { useEffect, useState } from "react"

export function PaymentPendingWaiter() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const check = async () => {
      if (cancelled) return

      attempts++

      try {
        const response = await fetch("/api/membership-status", {
          cache: "no-store",
        })

        const data = await response.json()

        if (data.active) {
          window.location.replace("/vip")
          return
        }
      } catch {}

      setSeconds(attempts)

      if (attempts < 90) {
        setTimeout(check, 1000)
      } else {
        window.location.replace("/pricing")
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Verificando pago... {seconds}s
    </p>
  )
}