"use client"

import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logoutToHome } from "@/lib/auth/logout-to-home"

export function AuthTopbarSimple() {
  const [supabase] =
    useState(
      () => createClient()
    )

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const logout = async () => {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)

    await logoutToHome(
      supabase
    )
  }

  return (
    <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-gold/10 bg-black/80 px-6 py-4 backdrop-blur-md">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.35em] text-gold"
      >
        The Golden Circle
      </Link>

      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="text-xs uppercase tracking-[0.25em] text-gold/80 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
      >
        {loggingOut
          ? "Cerrando..."
          : "Cerrar sesión"}
      </button>
    </header>
  )
}