"use client"

import { useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      if (response.status === 401) {
        window.location.href = `/login?next=/checkout?plan=${plan}&country=pe`
        return
      }

      const data = await response.json()

      if (data?.url) {
        window.location.href = data.url
        return
      }

      setLoading(false)
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
      {loading ? "Preparando pago..." : "Activar acceso"}
    </button>
  )
}