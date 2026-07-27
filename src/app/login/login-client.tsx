"use client"

import { useState } from "react"

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { LoginForm } from "./login-form"

type Mode =
  | "login"
  | "register"
  | "forgot"

type Props = {
  nextPath: string
  errorReturnPath: string
  oauthErrorMessage?: string
}

export function LoginClient({
  nextPath,
  errorReturnPath,
  oauthErrorMessage = "",
}: Props) {
  const [mode, setMode] =
    useState<Mode>("login")

  return (
    <main className="flex min-h-dvh items-center bg-background px-6 py-20 font-serif text-foreground">
      <div className="featured-card mx-auto w-full max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-normal leading-tight">
          Acceso privado
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Inicia sesión para continuar.
        </p>

        <GoogleSignInButton
          nextPath={nextPath}
          label="Iniciar sesión con Google"
          errorReturnPath={
            errorReturnPath
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

        <div
          className="my-6 flex items-center gap-3"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-gold/15" />

          <span className="text-[10px] uppercase tracking-[0.3em] text-gold/45">
            o con correo
          </span>

          <span className="h-px flex-1 bg-gold/15" />
        </div>

        <div className="[&>div>button:nth-of-type(2)]:hidden">
          <LoginForm
            mode={mode}
            setMode={setMode}
            onlyLogin
            nextPath={nextPath}
          />
        </div>
      </div>
    </main>
  )
}