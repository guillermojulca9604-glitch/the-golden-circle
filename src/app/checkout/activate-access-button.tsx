"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  plan: "monthly" | "quarterly"
}

export function ActivateAccessButton({ plan }: Props) {
  const [isWorking, setIsWorking] = useState(false)
  const isSendingRef = useRef(false)

  useEffect(() => {
    const resetButton = () => {
      setIsWorking(false)
      isSendingRef.current = false
    }

    window.addEventListener("pageshow", resetButton)
    window.addEventListener("focus", resetButton)

    return () => {
      window.removeEventListener("pageshow", resetButton)
      window.removeEventListener("focus", resetButton)
    }
  }, [])

  const handleClick = async () => {
    if (isSendingRef.current) return

    isSendingRef.current = true
    setIsWorking(true)

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

      if (data?.url) {
        window.location.href = data.url
        return
      }

      setIsWorking(false)
      isSendingRef.current = false
    } catch {
      setIsWorking(false)
      isSendingRef.current = false
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={isWorking}
      className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
    >
      Activar acceso
    </button>
  )
}