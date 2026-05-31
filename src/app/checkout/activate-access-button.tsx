"use client"

import { useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [disabled, setDisabled] = useState(false)

  const handleClick = async () => {
    if (disabled) return

    setDisabled(true)

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

    if (data.url) {
      window.location.href = data.url
      return
    }

    setDisabled(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] disabled:cursor-wait disabled:opacity-70"
    >
      Activar acceso
    </button>
  )
}