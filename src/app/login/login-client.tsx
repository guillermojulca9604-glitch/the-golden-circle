"use client"

import { useState } from "react"
import { LoginForm } from "./login-form"

type Props = {
  nextPath: string
}

export function LoginClient({ nextPath }: Props) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login")

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
          {mode === "login" && "Inicia sesión para continuar."}
          {mode === "register" && "Crea tu cuenta para continuar."}
          {mode === "forgot" &&
            "Ingresa tu correo y te enviaremos un enlace de recuperación."}
        </p>

        <LoginForm
          mode={mode}
          setMode={setMode}
          onlyLogin={false}
          nextPath={nextPath}
        />
      </div>
    </main>
  )
}