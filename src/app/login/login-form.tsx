"use client"

import type {
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  SetStateAction,
} from "react"
import {
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

type Mode =
  | "login"
  | "register"
  | "forgot"

type Props = {
  mode: Mode
  setMode: Dispatch<
    SetStateAction<Mode>
  >
  onlyLogin?: boolean
  nextPath?: string
}

function getSafeNextPath(
  nextPath: string
) {
  if (
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//")
  ) {
    return "/entry"
  }

  return nextPath
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      className="block h-5 w-5"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      className="block h-5 w-5"
    >
      {/*
       * El contorno del ojo es exactamente
       * igual al estado visible.
       */}
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/*
       * La línea se dibuja sobre el ojo.
       */}
      <path
        d="M3.25 3.25 20.75 20.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/*
       * La pupila se dibuja al final para que
       * conserve su circunferencia completa.
       */}
      <circle
        cx="12"
        cy="12"
        r="2.75"
        fill="black"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

export function LoginForm({
  mode,
  setMode,
  onlyLogin = false,
  nextPath = "/entry",
}: Props) {
  const [supabase] =
    useState(
      () => createClient()
    )

  const passwordInputRef =
    useRef<HTMLInputElement>(
      null
    )

  const [email, setEmail] =
    useState("")

  const [
    password,
    setPassword,
  ] = useState("")

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState("")

  const [
    loading,
    setLoading,
  ] = useState(false)

  const safeNext =
    getSafeNextPath(nextPath)

  const handleSubmit =
    async () => {
      const cleanEmail =
        email.trim()

      if (
        !cleanEmail ||
        !password
      ) {
        setMessage(
          "Completa correo y contraseña."
        )

        return
      }

      if (loading) {
        return
      }

      setLoading(true)
      setMessage(
        "Procesando..."
      )

      if (
        mode === "register"
      ) {
        const { error } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,

            options: {
              emailRedirectTo:
                `${window.location.origin}` +
                "/auth/confirm" +
                `?next=${encodeURIComponent(
                  safeNext
                )}`,
            },
          })

        setLoading(false)

        if (error) {
          setMessage(
            "No se pudo crear la cuenta. Verifica tus datos."
          )

          return
        }

        setMessage(
          "Cuenta creada. Revisa tu correo para confirmarla."
        )

        return
      }

      const { error } =
        await supabase.auth
          .signInWithPassword({
            email: cleanEmail,
            password,
          })

      if (error) {
        setLoading(false)

        setMessage(
          "Correo o contraseña incorrectos."
        )

        return
      }

      /*
       * Login se reemplaza por /entry.
       * /entry decide si corresponde
       * abrir Admin, Pricing o VIP.
       */
      window.location.replace(
        safeNext
      )
    }

  const handleForgotPassword =
    async () => {
      const cleanEmail =
        email.trim()

      if (!cleanEmail) {
        setMessage(
          "Ingresa tu correo para recuperar tu contraseña."
        )

        return
      }

      if (loading) {
        return
      }

      setLoading(true)

      setMessage(
        "Enviando correo de recuperación..."
      )

      const { error } =
        await supabase.auth
          .resetPasswordForEmail(
            cleanEmail,
            {
              redirectTo:
                `${window.location.origin}` +
                "/reset-password",
            }
          )

      setLoading(false)

      if (error) {
        setMessage(
          "No se pudo enviar el correo de recuperación."
        )

        return
      }

      setMessage(
        "Te enviamos un enlace para cambiar tu contraseña."
      )
    }

  const submitOnEnter = (
    event:
      KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key !== "Enter"
    ) {
      return
    }

    event.preventDefault()

    if (
      mode === "forgot"
    ) {
      void handleForgotPassword()
      return
    }

    void handleSubmit()
  }

  const togglePasswordVisibility = (
    event:
      MouseEvent<HTMLButtonElement>
  ) => {
    /*
     * El ojo únicamente alterna la
     * visibilidad de la contraseña.
     */
    setShowPassword(
      (current) => !current
    )

    /*
     * El campo deja de estar activo.
     * Desaparece el cursor y, en móvil,
     * se cierra el teclado.
     */
    passwordInputRef.current?.blur()

    /*
     * El botón tampoco conserva el foco.
     * De este modo Enter no vuelve a
     * activar el ojo.
     */
    event.currentTarget.blur()
  }

  return (
    <div className="space-y-4">
      <input
        type="email"
        autoComplete="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(event) =>
          setEmail(
            event.target.value
          )
        }
        onKeyDown={
          submitOnEnter
        }
        disabled={loading}
        className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-foreground outline-none transition focus:border-gold/50 disabled:opacity-60"
      />

      {mode !== "forgot" && (
        <div className="relative">
          <input
            ref={passwordInputRef}
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            placeholder="Contraseña"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            onKeyDown={
              submitOnEnter
            }
            disabled={loading}
            className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 pr-16 text-foreground outline-none transition focus:border-gold/50 disabled:opacity-60"
          />

          <button
            type="button"
            tabIndex={-1}
            onClick={
              togglePasswordVisibility
            }
            disabled={loading}
            aria-label={
              showPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
            aria-pressed={
              showPassword
            }
            title={
              showPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-gold/70 transition hover:bg-gold/5 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {showPassword
              ? (
                <EyeIcon />
              )
              : (
                <EyeOffIcon />
              )}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={
          mode === "forgot"
            ? handleForgotPassword
            : handleSubmit
        }
        disabled={loading}
        className="telegram-button w-full rounded-xl px-6 py-4 disabled:pointer-events-none disabled:opacity-70"
      >
        {loading &&
          "Procesando..."}

        {!loading &&
          mode === "login" &&
          "Iniciar sesión"}

        {!loading &&
          mode === "register" &&
          "Crear cuenta"}

        {!loading &&
          mode === "forgot" &&
          "Enviar enlace"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => {
            setMode("forgot")
            setMessage("")
            setPassword("")
            setShowPassword(false)
          }}
          disabled={loading}
          className="text-sm text-gold/70 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
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
          disabled={loading}
          className="text-sm text-gold/70 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
        >
          Volver a iniciar sesión
        </button>
      )}

      {!onlyLogin &&
        mode !== "forgot" && (
          <button
            type="button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              )

              setMessage("")
              setPassword("")
              setShowPassword(false)
            }}
            disabled={loading}
            className="block w-full text-sm text-gold/70 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "Ya tengo cuenta"}
          </button>
        )}

      <p className="min-h-5 text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  )
}