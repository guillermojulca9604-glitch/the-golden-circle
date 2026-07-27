"use client"

import Link from "next/link"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

type Plan =
  | "monthly"
  | "quarterly"

type Props = {
  plan: Plan
  oauthErrorMessage?: string
}

export function SubscriptionAccessClient({
  plan,
  oauthErrorMessage = "",
}: Props) {
  const nextPath =
    `/checkout?plan=${plan}`

  const loginPath =
    "/login" +
    `?next=${encodeURIComponent(
      nextPath
    )}`

  return (
    <main className="flex min-h-dvh items-center bg-background px-6 py-20 font-serif text-foreground">
      <div className="featured-card mx-auto w-full max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-normal leading-tight">
          Crear cuenta
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Regístrate para continuar.
        </p>

        <GoogleSignInButton
          nextPath={nextPath}
          label="Registrarse con Google"
          errorReturnPath={
            `/suscripcion/acceso?plan=${plan}`
          }
        />

        {oauthErrorMessage && (
          <p
            className="mt-4 text-sm leading-relaxed text-red-300"
            role="alert"
          >
            {oauthErrorMessage}
          </p>
        )}

        <Link
          href={loginPath}
          className="mt-7 block text-sm text-gold/70 transition hover:text-gold"
        >
          ¿Ya tienes una cuenta? Inicia sesión
        </Link>
      </div>
    </main>
  )
}