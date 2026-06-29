"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [loading, setLoading] = useState(false)
  const checkTimerRef = useRef<number | null>(null)

  const stopChecking = () => {
    if (checkTimerRef.current) {
      window.clearInterval(checkTimerRef.current)
      checkTimerRef.current = null
    }
  }

  const checkMembership = async () => {
    try {
      const response = await fetch("/api/membership-status", {
        cache: "no-store",
      })

      if (!response.ok) return false

      const data = await response.json()
      return Boolean(data.active)
    } catch {
      return false
    }
  }

  useEffect(() => {
    return () => {
      stopChecking()
    }
  }, [])

  const handleClick = async () => {
    if (loading) return

    setLoading(true)

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

      if (!data?.url) {
        setLoading(false)
        return
      }

      const paymentWindow = window.open(data.url, "_blank")

      if (!paymentWindow) {
        window.location.href = data.url
        return
      }

      stopChecking()

      checkTimerRef.current = window.setInterval(async () => {
        const active = await checkMembership()

        if (active) {
          stopChecking()
          window.location.replace("/vip")
          return
        }

        if (paymentWindow.closed) {
          stopChecking()

          const activeAfterClose = await checkMembership()

          if (activeAfterClose) {
            window.location.replace("/vip")
          } else {
            setLoading(false)
          }
        }
      }, 700)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-75"
    >
      {loading ? "Redirigiendo..." : "Activar acceso"}
    </button>
  )
}