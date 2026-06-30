"use client"

import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export function AuthTopbarSimple() {
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.replace("/")
  }

  return (
    <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-gold/10 bg-black/80 px-6 py-4 backdrop-blur-md">
      <Link href="/" className="text-xs uppercase tracking-[0.35em] text-gold">
        The Golden Circle
      </Link>

      <button
        type="button"
        onClick={logout}
        className="text-xs uppercase tracking-[0.25em] text-gold/80 transition hover:text-gold"
      >
        Cerrar sesión
      </button>
    </header>
  )
}