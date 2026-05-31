"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function ResetPasswordForm() {
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")

  const updatePassword = async () => {
    if (!password) {
      setMessage("Ingresa una nueva contraseña.")
      return
    }

    setMessage("Actualizando...")

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage("No se pudo actualizar la contraseña.")
      return
    }

    setMessage("Contraseña actualizada. Ya puedes iniciar sesión.")

    setTimeout(() => {
      window.location.href = "/login?next=/vip&source=header"
    }, 1200)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Nueva contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 pr-14 text-foreground outline-none transition focus:border-gold/50"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gold/60 transition duration-300 hover:scale-110 hover:text-gold"
        >
          {showPassword ? "◉" : "◌"}
        </button>
      </div>

      <button
        type="button"
        onClick={updatePassword}
        className="telegram-button w-full rounded-xl px-6 py-4"
      >
        Guardar contraseña
      </button>

      <p className="min-h-5 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}