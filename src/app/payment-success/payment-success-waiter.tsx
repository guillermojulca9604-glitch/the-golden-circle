"use client"

import { useEffect, useState } from "react"

export function PaymentSuccessWaiter() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const checkMembership = async () => {
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
      Verificando acceso... {seconds}s
    </p>
  )
}