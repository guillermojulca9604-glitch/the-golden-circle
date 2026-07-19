"use client"

import { useState } from "react"

import { LoginForm } from "@/app/login/login-form"

type Mode =
  | "login"
  | "register"
  | "forgot"

type Plan =
  | "monthly"
  | "quarterly"

type Props = {
  plan: Plan
}

export function SubscriptionAccessClient({
  plan,
}: Props) {
  /*
   * En Suscripción se muestra primero
   * el inicio de sesión.
   *
   * Desde el mismo formulario, el usuario
   * puede registrarse o recuperar su acceso.
   */
  const [mode, setMode] =
    useState<Mode>("login")

  /*
   * Aunque el plan ya no se muestra en pantalla,
   * permanece guardado para llevarlo a Checkout.
   */
  const nextPath =
    `/checkout?plan=${plan}`

  return (
    <main className="min-h-dvh bg-background px-6 py-20 text-foreground">
      <div className="featured-card mx-auto max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-light leading-tight">
          {mode === "login" &&
            "Iniciar sesión"}

          {mode === "register" &&
            "Crear cuenta"}

          {mode === "forgot" &&
            "Recuperar acceso"}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {mode === "login" &&
            "Inicia sesión para continuar con tu suscripción."}

          {mode === "register" &&
            "Crea una cuenta para continuar con tu suscripción."}

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