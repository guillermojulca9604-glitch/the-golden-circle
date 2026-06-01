"use client"

import { useEffect, useState } from "react"

export function PaymentWaiter() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let attempts = 0

    const checkMembership = async () => {
      attempts++

      try {
        const response = await fetch("/api/membership/status", {
          cache: "no-store",
        })

        const data = await response.json()

        if (data.active) {
          sessionStorage.clear()
          window.location.replace("/vip")
          return
        }
      } catch {}

      setSeconds(attempts)

      if (attempts < 20) {
        setTimeout(checkMembership, 1000)
      }
    }

    checkMembership()
  }, [])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Validando acceso automáticamente... {seconds > 0 ? `${seconds}s` : ""}
    </p>
  )
}