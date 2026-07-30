"use client"

import type {
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  SetStateAction,
} from "react"
import {
  useEffect,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

const RECOVERY_STORAGE_KEY =
  "golden-circle-password-recovery-retry-at"

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

type PasswordResetResponse = {
  success?: boolean
  message?: string
  error?: string
  reason?: string
  retryAt?: string
  retryAfterSeconds?: number
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

function getRemainingSeconds(
  retryAt: number
) {
  return Math.max(
    0,
    Math.ceil(
      (
        retryAt -
        Date.now()
      ) / 1000
    )
  )
}

function formatCooldown(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        totalSeconds
      )
    )

  const hours =
    Math.floor(
      safeSeconds / 3600
    )

  const minutes =
    Math.floor(
      (
        safeSeconds % 3600
      ) / 60
    )

  const seconds =
    safeSeconds % 60

  const paddedMinutes =
    String(minutes)
      .padStart(2, "0")

  const paddedSeconds =
    String(seconds)
      .padStart(2, "0")

  if (hours > 0) {
    const paddedHours =
      String(hours)
        .padStart(2, "0")

    return (
      `${paddedHours}:` +
      `${paddedMinutes}:` +
      paddedSeconds
    )
  }

  return (
    `${paddedMinutes}:` +
    paddedSeconds
  )
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

  const [
    recoveryRetryAt,
    setRecoveryRetryAt,
  ] =
    useState<number | null>(
      null
    )

  const [
    recoveryCooldown,
    setRecoveryCooldown,
  ] = useState(0)

  const safeNext =
    getSafeNextPath(
      nextPath
    )

  const normalizedRecoveryEmail =
    email
      .trim()
      .toLowerCase()

  const recoveryEmailIsValid =
    EMAIL_PATTERN.test(
      normalizedRecoveryEmail
    )

  useEffect(() => {
    const storedRetryAt =
      window.localStorage
        .getItem(
          RECOVERY_STORAGE_KEY
        )

    if (!storedRetryAt) {
      return
    }

    const parsedRetryAt =
      Number(storedRetryAt)

    if (
      !Number.isFinite(
        parsedRetryAt
      ) ||
      parsedRetryAt <=
        Date.now()
    ) {
      window.localStorage
        .removeItem(
          RECOVERY_STORAGE_KEY
        )

      return
    }

    setRecoveryRetryAt(
      parsedRetryAt
    )

    setRecoveryCooldown(
      getRemainingSeconds(
        parsedRetryAt
      )
    )
  }, [])

  useEffect(() => {
    if (!recoveryRetryAt) {
      setRecoveryCooldown(0)
      return
    }

    const updateCooldown =
      () => {
        const remaining =
          getRemainingSeconds(
            recoveryRetryAt
          )

        if (remaining <= 0) {
          setRecoveryCooldown(0)
          setRecoveryRetryAt(
            null
          )

          window.localStorage
            .removeItem(
              RECOVERY_STORAGE_KEY
            )

          return
        }

        setRecoveryCooldown(
          remaining
        )
      }

    updateCooldown()

    const intervalId =
      window.setInterval(
        updateCooldown,
        1000
      )

    return () => {
      window.clearInterval(
        intervalId
      )
    }
  }, [recoveryRetryAt])

  const startRecoveryCooldown =
    (
      retryAtValue:
        string | undefined,

      retryAfterSeconds:
        number | undefined
    ) => {
      const parsedRetryAt =
        retryAtValue
          ? new Date(
              retryAtValue
            ).getTime()
          : Number.NaN

      const fallbackSeconds =
        typeof retryAfterSeconds ===
          "number" &&
        Number.isFinite(
          retryAfterSeconds
        )
          ? Math.max(
              1,
              retryAfterSeconds
            )
          : 60

      const retryAt =
        Number.isFinite(
          parsedRetryAt
        ) &&
        parsedRetryAt >
          Date.now()
          ? parsedRetryAt
          : Date.now() +
            fallbackSeconds *
              1000

      window.localStorage
        .setItem(
          RECOVERY_STORAGE_KEY,
          String(retryAt)
        )

      setRecoveryRetryAt(
        retryAt
      )

      setRecoveryCooldown(
        getRemainingSeconds(
          retryAt
        )
      )
    }

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

      window.location.replace(
        safeNext
      )
    }

  const handleForgotPassword =
    async () => {
      if (
        !recoveryEmailIsValid
      ) {
        setMessage(
          "Ingresa un correo válido."
        )

        return
      }

      if (
        loading ||
        recoveryCooldown > 0
      ) {
        return
      }

      setLoading(true)

      setMessage(
        "Enviando correo de recuperación..."
      )

      try {
        const response =
          await fetch(
            "/api/auth/request-password-reset",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "same-origin",

              cache:
                "no-store",

              body:
                JSON.stringify({
                  email:
                    normalizedRecoveryEmail,
                }),
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
            PasswordResetResponse

        if (
          result.retryAt ||
          result.retryAfterSeconds
        ) {
          startRecoveryCooldown(
            result.retryAt,
            result.retryAfterSeconds
          )
        }

        if (
          !response.ok ||
          !result.success
        ) {
          if (
            response.status ===
              429 ||
            result.reason ===
              "rate_limit"
          ) {
            setMessage("")
            return
          }

          setMessage(
            result.error ||
              "No se pudo enviar el correo de recuperación."
          )

          return
        }

        setMessage(
          result.message ||
            "Confirma el enlace enviado a tu correo."
        )
      } catch {
        setMessage(
          "No se pudo enviar el correo de recuperación. Inténtalo nuevamente."
        )
      } finally {
        setLoading(false)
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

    if (
      mode === "forgot"
    ) {
      void handleForgotPassword()
      return
    }

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

  const recoveryButtonDisabled =
    loading ||
    !recoveryEmailIsValid ||
    recoveryCooldown > 0

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

      {mode !== "forgot" && (
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
      )}

      <button
        type="button"
        onClick={
          mode === "forgot"
            ? handleForgotPassword
            : handleSubmit
        }
        disabled={
          mode === "forgot"
            ? recoveryButtonDisabled
            : loading
        }
        className="telegram-button w-full cursor-pointer rounded-xl px-6 py-4 active:scale-[0.98] disabled:cursor-pointer disabled:opacity-70"
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
          recoveryCooldown >
            0 &&
          `Nuevo intento en ${formatCooldown(
            recoveryCooldown
          )}`}

        {!loading &&
          mode === "forgot" &&
          recoveryCooldown ===
            0 &&
          "Enviar enlace"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => {
            setMode("forgot")
            setMessage("")
            setPassword("")
            setShowPassword(
              false
            )
          }}
          disabled={loading}
          className="cursor-pointer text-sm text-gold/70 transition hover:text-gold disabled:cursor-pointer disabled:opacity-50"
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
          className="cursor-pointer text-sm text-gold/70 transition hover:text-gold disabled:cursor-pointer disabled:opacity-50"
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
              setShowPassword(
                false
              )
            }}
            disabled={loading}
            className="block w-full cursor-pointer text-sm text-gold/70 transition hover:text-gold disabled:cursor-pointer disabled:opacity-50"
          >
            {mode === "login"
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