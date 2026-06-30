"use client"

import { useEffect, useState } from "react"
import { LoginForm } from "./login-form"

export function LoginClient() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login")

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/membership-status", {
          cache: "no-store",
        })

        if (response.status === 401) return

        const data = await response.json()

        if (data.active) {
          window.location.replace("/vip")
        } else {
          window.location.replace("/pricing")
        }
      } catch {}
    }

    window.addEventListener("pageshow", checkSession)
    window.addEventListener("focus", checkSession)

    return () => {
      window.removeEventListener("pageshow", checkSession)
      window.removeEventListener("focus", checkSession)
    }
  }, [])

  return (
    <main className="min-h-dvh bg-background px-6 py-20 text-foreground">
      <div className="featured-card mx-auto max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-light leading-tight">
          {mode === "login" && "Acceso privado"}
          {mode === "register" && "Crear cuenta"}
          {mode === "forgot" && "Recuperar acceso"}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {mode === "login" && "Inicia sesión para continuar con tu membresía."}
          {mode === "register" && "Regístrate para acceder a la membresía."}
          {mode === "forgot" &&
            "Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña."}
        </p>

        <LoginForm mode={mode} setMode={setMode} onlyLogin={false} />
      </div>
    </main>
  )
}