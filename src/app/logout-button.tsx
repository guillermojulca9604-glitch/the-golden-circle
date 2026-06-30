"use client"

import { createClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.replace("/login")
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-8 text-xs uppercase tracking-[0.3em] text-gold/70 transition hover:text-gold"
    >
      Cerrar sesión
    </button>
  )
}