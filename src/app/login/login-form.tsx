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

import {
  createClient,
} from "@/lib/supabase/client"

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

type LoginDestinationResponse = {
  destination?: string | null
  isAdmin?: boolean
  error?: string
}

function getSafeNextPath(
  nextPath: string
) {
  if (
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath.includes("\\")
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
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M3.25 3.25 20.75 20.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

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

  const [
    email,
    setEmail,
  ] = useState("")

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

  /*
   * Se conserva "forgot" en el tipo
   * para no romper los componentes
   * externos que comparten Mode.
   *
   * Dentro de este formulario ya no
   * existe recuperación de contraseña.
   */
  const activeMode =
    mode === "register"
      ? "register"
      : "login"

  const safeNext =
    getSafeNextPath(
      nextPath
    )

  const resolveLoginDestination =
    async () => {
      const response =
        await fetch(
          "/api/auth/login-destination",
          {
            method: "GET",
            credentials:
              "same-origin",
            cache: "no-store",
          }
        )

      const result =
        (
          await response
            .json()
            .catch(
              () => ({})
            )
        ) as
          LoginDestinationResponse

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo comprobar el acceso."
        )
      }

      if (
        typeof result.destination ===
          "string"
      ) {
        return getSafeNextPath(
          result.destination
        )
      }

      return safeNext
    }

  const handleSubmit =
    async () => {
      const cleanEmail =
        email
          .trim()
          .toLowerCase()

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
        activeMode ===
        "register"
      ) {
        const {
          error,
        } =
          await supabase.auth
            .signUp({
              email:
                cleanEmail,

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

      const {
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              cleanEmail,

            password,
          })

      if (error) {
        setLoading(false)

        setMessage(
          "Correo o contraseña incorrectos."
        )

        return
      }

      try {
        const destination =
          await resolveLoginDestination()

        window.location.replace(
          destination
        )
      } catch (error) {
        setLoading(false)

        setMessage(
          error instanceof Error
            ? error.message
            : "La sesión se inició, pero no se pudo comprobar el acceso."
        )
      }
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

    void handleSubmit()
  }

  const togglePasswordVisibility =
    (
      event:
        MouseEvent<HTMLButtonElement>
    ) => {
      setShowPassword(
        (current) =>
          !current
      )

      passwordInputRef
        .current
        ?.blur()

      event.currentTarget
        .blur()
    }

  return (
    <div className="space-y-4">
      <input
        type="email"
        autoComplete="email"
        placeholder="Correo electrónico"
        value={email}
        onChange={(event) => {
          setEmail(
            event.target.value
          )

          setMessage("")
        }}
        onKeyDown={
          submitOnEnter
        }
        disabled={loading}
        className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-foreground placeholder:text-foreground/55 outline-none transition focus:border-gold/50 disabled:opacity-60"
      />

      <div className="relative">
        <input
          ref={
            passwordInputRef
          }
          type={
            showPassword
              ? "text"
              : "password"
          }
          autoComplete={
            activeMode ===
              "login"
              ? "current-password"
              : "new-password"
          }
          placeholder="Contraseña"
          value={password}
          onChange={(event) => {
            setPassword(
              event.target.value
            )

            setMessage("")
          }}
          onKeyDown={
            submitOnEnter
          }
          disabled={loading}
          className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 pr-16 text-foreground placeholder:text-foreground/55 outline-none transition focus:border-gold/50 disabled:opacity-60"
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
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full text-gold/70 transition hover:bg-gold/5 hover:text-gold active:scale-95 disabled:cursor-pointer disabled:opacity-50"
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

      <button
        type="button"
        onClick={
          handleSubmit
        }
        disabled={
          loading
        }
        className="telegram-button w-full cursor-pointer rounded-xl px-6 py-4 active:scale-[0.98] disabled:cursor-pointer disabled:opacity-70"
      >
        {loading
          ? "Procesando..."
          : activeMode ===
              "login"
            ? "Iniciar sesión"
            : "Crear cuenta"}
      </button>

      {!onlyLogin && (
        <button
          type="button"
          onClick={() => {
            setMode(
              activeMode ===
                "login"
                ? "register"
                : "login"
            )

            setMessage("")
            setPassword("")
            setShowPassword(
              false
            )
          }}
          disabled={loading}
          className="block w-full cursor-pointer text-sm text-gold/70 transition hover:text-gold disabled:cursor-pointer disabled:opacity-50"
        >
          {activeMode ===
            "login"
            ? "¿No tienes cuenta? Regístrate"
            : "Ya tengo cuenta"}
        </button>
      )}

      <p
        className="min-h-5 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  )
}