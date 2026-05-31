"use client"

import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dispatch, SetStateAction, useState } from "react"

type Mode = "login" | "register" | "forgot"

type Props = {
  mode: Mode
  setMode: Dispatch<SetStateAction<Mode>>
  onlyLogin?: boolean
}

export function LoginForm({ mode, setMode, onlyLogin = false }: Props) {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/pricing"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage("Completa correo y contraseña.")
      return
    }

    setMessage("Procesando...")

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?next=${next}`,
        },
      })

      if (error) {
        setMessage("No se pudo crear la cuenta. Verifica tus datos.")
        return
      }

      setMessage("Cuenta creada. Revisa tu correo para confirmarla.")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage("Correo o contraseña incorrectos.")
      return
    }

    if (email.toLowerCase() === "guillermojulca9604@gmail.com") {
  window.location.href = "/admin"
  return
}

window.location.href = next
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Ingresa tu correo para recuperar tu contraseña.")
      return
    }

    setMessage("Enviando correo de recuperación...")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setMessage("No se pudo enviar el correo de recuperación.")
      return
    }

    setMessage("Te enviamos un enlace para cambiar tu contraseña.")
  }

  return (
    <div className="space-y-4">
      <input
        type="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-foreground outline-none transition focus:border-gold/50"
      />

      {mode !== "forgot" && (
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
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
      )}

      <button
        type="button"
        onClick={mode === "forgot" ? handleForgotPassword : handleSubmit}
        className="telegram-button w-full rounded-xl px-6 py-4"
      >
        {mode === "login" && "Iniciar sesión"}
        {mode === "register" && "Crear cuenta"}
        {mode === "forgot" && "Enviar enlace"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => {
            setMode("forgot")
            setMessage("")
            setPassword("")
          }}
          className="text-sm text-gold/70 transition hover:text-gold"
        >
          ¿Olvidaste tu contraseña?
        </button>
      )}

      {mode === "forgot" && (
        <button
          type="button"
          onClick={() => {
            setMode("login")
            setMessage("")
          }}
          className="text-sm text-gold/70 transition hover:text-gold"
        >
          Volver a iniciar sesión
        </button>
      )}

      {!onlyLogin && mode !== "forgot" && (
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login")
            setMessage("")
            setPassword("")
          }}
          className="block w-full text-sm text-gold/70 transition hover:text-gold"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
        </button>
      )}

      <p className="min-h-5 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}