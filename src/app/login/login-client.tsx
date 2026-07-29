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
    <main
      className="
        flex
        h-dvh
        min-h-dvh
        max-h-dvh
        overflow-y-auto
        bg-background
        px-4
        py-[clamp(1.5rem,6vh,5rem)]
        font-serif
        text-foreground
        sm:px-6
      "
    >
      <div
        className="
          featured-card
          mx-auto
          my-auto
          w-full
          max-w-md
          rounded-[34px]
          bg-black
          p-[clamp(1.5rem,4vh,2.5rem)]
          text-center
          [&_.telegram-button:active]:scale-[0.98]
        "
      >
        <span
          className="
            mb-[clamp(0.75rem,2vh,1.25rem)]
            block
            text-xs
            uppercase
            tracking-[0.45em]
            text-gold
          "
        >
          The Golden Circle
        </span>

        <h1
          className="
            mb-[clamp(0.625rem,1.6vh,1rem)]
            text-[clamp(2.5rem,6vh,3rem)]
            font-normal
            leading-tight
          "
        >
          Acceso privado
        </h1>

        <p
          className="
            mb-[clamp(1.25rem,3.5vh,2rem)]
            text-sm
            leading-relaxed
            text-muted-foreground
          "
        >
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
            className="
              mt-4
              text-sm
              leading-relaxed
              text-red-300
            "
            role="alert"
          >
            {oauthErrorMessage}
          </p>
        )}

        <div
          className="
            my-[clamp(1rem,3vh,1.5rem)]
            flex
            items-center
            gap-3
          "
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-gold/15" />

          <span
            className="
              text-[10px]
              uppercase
              tracking-[0.3em]
              text-gold/45
            "
          >
            o
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