"use client"

import {
  type FormEvent,
  type MouseEvent,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

const MINIMUM_PASSWORD_LENGTH = 12
const MAXIMUM_PASSWORD_LENGTH = 24

type ResetPasswordResponse = {
  success?: boolean
  error?: string
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

export function ResetPasswordForm() {
  const [supabase] =
    useState(
      () => createClient()
    )

  const passwordInputRef =
    useRef<HTMLInputElement>(
      null
    )

  const confirmPasswordInputRef =
    useRef<HTMLInputElement>(
      null
    )

  const [
    password,
    setPassword,
  ] = useState("")

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("")

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  const [
    showConfirmPassword,
    setShowConfirmPassword,
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
    passwordUpdated,
    setPasswordUpdated,
  ] = useState(false)

  const passwordLengthIsValid =
    password.length >=
      MINIMUM_PASSWORD_LENGTH &&
    password.length <=
      MAXIMUM_PASSWORD_LENGTH

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword

  const formIsComplete =
    passwordLengthIsValid &&
    passwordsMatch

  const clearMessage = () => {
    setMessage("")
  }

  const togglePasswordVisibility = (
    event:
      MouseEvent<HTMLButtonElement>
  ) => {
    setShowPassword(
      (currentValue) =>
        !currentValue
    )

    passwordInputRef.current?.blur()
    event.currentTarget.blur()
  }

  const toggleConfirmPasswordVisibility =
    (
      event:
        MouseEvent<HTMLButtonElement>
    ) => {
      setShowConfirmPassword(
        (currentValue) =>
          !currentValue
      )

      confirmPasswordInputRef
        .current
        ?.blur()

      event.currentTarget.blur()
    }

  const updatePassword = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (loading) {
      return
    }

    if (!passwordLengthIsValid) {
      setMessage(
        "La contraseña debe tener entre 12 y 24 caracteres."
      )

      return
    }

    if (!passwordsMatch) {
      setMessage(
        "Las contraseñas no coinciden."
      )

      return
    }

    setLoading(true)

    setMessage(
      "Actualizando contraseña..."
    )

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body: JSON.stringify({
              password,
            }),
          }
        )

      const result =
        (await response.json()) as
          ResetPasswordResponse

      if (
        !response.ok ||
        !result.success
      ) {
        setMessage(
          result.error ||
            "No se pudo actualizar la contraseña."
        )

        return
      }

      /*
       * Cerramos la sesión temporal creada
       * mediante el enlace de recuperación.
       */
      await supabase.auth.signOut({
        scope: "local",
      })

      setPassword("")
      setConfirmPassword("")

      setShowPassword(false)
      setShowConfirmPassword(false)

      setMessage("")
      setPasswordUpdated(true)
    } catch {
      setMessage(
        "No se pudo actualizar la contraseña. Inténtalo nuevamente."
      )
    } finally {
      setLoading(false)
    }
  }

  const returnToLogin = () => {
    window.location.replace(
      "/login"
    )
  }

  if (passwordUpdated) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">
          Contraseña actualizada
          correctamente. Los cambios ya
          fueron aplicados.
        </p>

        <button
          type="button"
          onClick={
            returnToLogin
          }
          className="telegram-button w-full rounded-xl px-6 py-4"
        >
          Volver a iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={
        updatePassword
      }
      noValidate
    >
      <div>
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
            placeholder="Nueva contraseña"
            value={password}
            minLength={
              MINIMUM_PASSWORD_LENGTH
            }
            maxLength={
              MAXIMUM_PASSWORD_LENGTH
            }
            autoComplete="new-password"
            disabled={loading}
            onChange={(event) => {
              setPassword(
                event.target.value
              )

              clearMessage()
            }}
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
                ? "Ocultar nueva contraseña"
                : "Mostrar nueva contraseña"
            }
            aria-pressed={
              showPassword
            }
            title={
              showPassword
                ? "Ocultar nueva contraseña"
                : "Mostrar nueva contraseña"
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

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Entre 12 y 24 caracteres
          </span>

          <span>
            {password.length} /{" "}
            {MAXIMUM_PASSWORD_LENGTH}
          </span>
        </div>
      </div>

      <div>
        <div className="relative">
          <input
            ref={
              confirmPasswordInputRef
            }
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirmar contraseña"
            value={
              confirmPassword
            }
            maxLength={
              MAXIMUM_PASSWORD_LENGTH
            }
            autoComplete="new-password"
            disabled={loading}
            onChange={(event) => {
              setConfirmPassword(
                event.target.value
              )

              clearMessage()
            }}
            className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 pr-16 text-foreground outline-none transition focus:border-gold/50 disabled:opacity-60"
          />

          <button
            type="button"
            tabIndex={-1}
            onClick={
              toggleConfirmPasswordVisibility
            }
            disabled={loading}
            aria-label={
              showConfirmPassword
                ? "Ocultar confirmación"
                : "Mostrar confirmación"
            }
            aria-pressed={
              showConfirmPassword
            }
            title={
              showConfirmPassword
                ? "Ocultar confirmación"
                : "Mostrar confirmación"
            }
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full text-gold/70 transition hover:bg-gold/5 hover:text-gold active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {showConfirmPassword
              ? (
                <EyeIcon />
              )
              : (
                <EyeOffIcon />
              )}
          </button>
        </div>

        {confirmPassword.length >
          0 &&
          !passwordsMatch && (
            <p className="mt-2 text-left text-xs text-red-400">
              Las contraseñas no
              coinciden.
            </p>
          )}
      </div>

      <button
        type="submit"
        disabled={
          !formIsComplete ||
          loading
        }
        className="telegram-button w-full rounded-xl px-6 py-4 disabled:pointer-events-none disabled:opacity-70"
      >
        {loading
          ? "Actualizando..."
          : "Guardar contraseña"}
      </button>

      <p
        className="min-h-5 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  )
}