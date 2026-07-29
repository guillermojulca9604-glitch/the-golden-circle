"use client"

import Link from "next/link"
import { useState } from "react"

import { logoutToHome } from "@/lib/auth/logout-to-home"
import { createClient } from "@/lib/supabase/client"

export function AuthTopbarSimple() {
  const [supabase] = useState(
    () => createClient()
  )

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const [
    logoutError,
    setLogoutError,
  ] = useState("")

  const logout = async () => {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)
    setLogoutError("")

    try {
      await logoutToHome(
        supabase
      )
    } catch {
      setLoggingOut(false)

      setLogoutError(
        "No se pudo cerrar la sesión. Inténtalo nuevamente."
      )
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-11 w-full items-center justify-between border-b border-gold/20 bg-black/80 px-4 backdrop-blur-md sm:px-6">
      <Link
        href="/"
        className="shrink-0 whitespace-nowrap text-xs font-medium uppercase leading-none tracking-[0.35em] text-gold/90"
      >
        The Golden Circle
      </Link>

      <div className="flex min-w-0 items-center gap-4">
        {logoutError && (
          <p className="hidden text-xs text-red-300 md:block">
            {logoutError}
          </p>
        )}

        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="shrink-0 cursor-pointer whitespace-nowrap text-xs font-medium uppercase leading-none tracking-[0.25em] text-gold/85 transition-colors duration-200 hover:text-gold disabled:cursor-wait disabled:opacity-50"
        >
          {loggingOut
            ? "Cerrando..."
            : "Cerrar sesión"}
        </button>
      </div>
    </header>
  )
}