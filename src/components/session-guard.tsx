"use client"

import { useEffect } from "react"

type Props = {
  mode: "pricing" | "checkout" | "vip"
}

export function SessionGuard({ mode }: Props) {
  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch("/api/membership-status", {
          cache: "no-store",
        })

        if (response.status === 401) {
          window.location.replace("/")
          return
        }

        const data = await response.json()

        if (data.active && mode !== "vip") {
          window.location.replace("/vip")
          return
        }

        if (!data.active && mode === "vip") {
          window.location.replace("/pricing")
        }
      } catch {
        window.location.replace("/")
      }
    }

    window.addEventListener("pageshow", check)
    window.addEventListener("focus", check)

    check()

    return () => {
      window.removeEventListener("pageshow", check)
      window.removeEventListener("focus", check)
    }
  }, [mode])

  return null
}