"use client"

import {
  useEffect,
  useState,
} from "react"

export function PaymentSuccessWaiter() {
  const [
    seconds,
    setSeconds,
  ] = useState(0)

  useEffect(() => {
    let cancelled = false

    let timeoutId:
      | ReturnType<
          typeof setTimeout
        >
      | undefined

    let attempts = 0

    const check = async () => {
      if (cancelled) {
        return
      }

      attempts += 1

      try {
        const response =
          await fetch(
            "/api/membership-status",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            }
          )

        if (
          response.status ===
          401
        ) {
          window.location.replace(
            "/"
          )

          return
        }

        if (response.ok) {
          const data =
            await response.json()

          if (data.active) {
            window.location.replace(
              "/vip"
            )

            return
          }
        }
      } catch {
        /*
         * Se vuelve a intentar.
         */
      }

      setSeconds(attempts)

      if (
        attempts < 90
      ) {
        timeoutId =
          setTimeout(
            check,
            1000
          )
      } else {
        window.location.replace(
          "/payment-pending"
        )
      }
    }

    void check()

    return () => {
      cancelled = true

      if (timeoutId) {
        clearTimeout(
          timeoutId
        )
      }
    }
  }, [])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Activando acceso...{" "}
      {seconds}s
    </p>
  )
}