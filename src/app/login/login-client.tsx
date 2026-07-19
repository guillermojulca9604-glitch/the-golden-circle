"use client"

import { useState } from "react"

import { LoginForm } from "./login-form"

type Mode =
  | "login"
  | "register"
  | "forgot"

type Props = {
  nextPath: string
}

export function LoginClient({
  nextPath,
}: Props) {
  const [mode, setMode] =
    useState<Mode>("login")

  return (
    <main className="min-h-dvh bg-background px-6 py-20 text-foreground">
      <div className="featured-card mx-auto max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-light leading-tight">
          {mode === "forgot"
            ? "Recuperar acceso"
            : "Acceso privado"}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {mode === "forgot"
            ? "Ingresa tu correo y te enviaremos un enlace de recuperación."
            : "Inicia sesión para continuar."}
        </p>

        <LoginForm
          mode={mode}
          setMode={setMode}
          onlyLogin
          nextPath={nextPath}
        />
      </div>
    </main>
  )
}