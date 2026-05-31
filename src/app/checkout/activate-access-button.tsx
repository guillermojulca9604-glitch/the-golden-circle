"use client"

import { useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleClick = async () => {
    setLoading(true)
    setError("")

    const response = await fetch("/api/mercadopago/create-preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    })

    const data = await response.json()

    if (!response.ok || !data.url) {
      setLoading(false)
      setError("No se pudo iniciar el pago.")
      return
    }

    window.location.href = data.url
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] disabled:opacity-60"
      >
        {loading ? "Preparando acceso..." : "Activar acceso"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}