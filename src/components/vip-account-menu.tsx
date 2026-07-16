"use client"

import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logoutToHome } from "@/lib/auth/logout-to-home"

type Props = {
  email?: string | null
}

export function VipAccountMenu({
  email,
}: Props) {
  const [supabase] =
    useState(
      () => createClient()
    )

  const [open, setOpen] =
    useState(false)

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
        href="/vip"
        className="text-xs uppercase tracking-[0.35em] text-gold"
      >
        The Golden Circle
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current
            )
          }
          aria-expanded={open}
          aria-label="Abrir menú de cuenta"
          className="flex items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/30 bg-black text-gold shadow-[0_0_20px_rgba(212,175,55,0.16)]">
            ♙
          </div>

          <span className="text-gold/70">
            ▾
          </span>
        </button>

        {open && (
          <div className="absolute right-0 mt-4 w-72 rounded-xl border border-gold/20 bg-black p-4 text-left shadow-2xl">
            <div className="absolute -top-2 right-5 h-4 w-4 rotate-45 border-l border-t border-gold/20 bg-black" />

            <p className="text-xs uppercase tracking-[0.25em] text-gold/60">
              Cuenta
            </p>

            <p className="mt-3 break-all text-sm text-muted-foreground">
              {email || "Usuario"}
            </p>

            <div className="my-4 h-px bg-gold/15" />

            <button
              type="button"
              onClick={logout}
              disabled={
                loggingOut
              }
              className="w-full text-left text-sm font-semibold text-foreground transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
            >
              {loggingOut
                ? "Cerrando..."
                : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}