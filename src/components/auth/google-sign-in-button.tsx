"use client"

import Script from "next/script"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

type GoogleSignInButtonProps = {
  nextPath?: string
  label?: string

  /*
   * Se conserva porque las páginas actuales
   * todavía envían esta propiedad.
   */
  errorReturnPath?: string
}

type GoogleCodeResponse = {
  code?: string
  error?: string
  error_description?: string
}

type GooglePopupError = {
  type?:
    | "popup_failed_to_open"
    | "popup_closed"
    | "unknown"
}

type GoogleCodeClient = {
  requestCode: () => void
}

type GoogleOAuth2 = {
  initCodeClient: (config: {
    client_id: string
    scope: string
    ux_mode: "popup"
    select_account: boolean
    callback: (
      response: GoogleCodeResponse
    ) => void
    error_callback: (
      error: GooglePopupError
    ) => void
  }) => GoogleCodeClient
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: GoogleOAuth2
      }
    }
  }
}

type SignInPhase =
  | "idle"
  | "waiting_google"
  | "exchanging"

function getSafeInternalPath(
  value: string,
  fallback: string
) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback
  }

  return value
}

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-1.99 3.02v2.54h3.23c1.89-1.74 2.98-4.31 2.98-7.41Z"
      />

      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.36l-3.23-2.54c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.08v2.62A10 10 0 0 0 12 22Z"
      />

      <path
        fill="#FBBC05"
        d="M6.41 13.94A6.02 6.02 0 0 1 6.1 12c0-.67.11-1.32.31-1.94V7.44H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.56l3.33-2.62Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.92 5.44l3.33 2.62C7.2 7.7 9.4 5.94 12 5.94Z"
      />
    </svg>
  )
}

export function GoogleSignInButton({
  nextPath = "/entry",
  label = "Continuar con Google",
}: GoogleSignInButtonProps) {
  const codeClientRef =
    useRef<GoogleCodeClient | null>(
      null
    )

  const phaseRef =
    useRef<SignInPhase>("idle")

  const popupOpenedAtRef =
    useRef(0)

  const safetyTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  const focusTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  const mountedRef =
    useRef(true)

  const [
    googleReady,
    setGoogleReady,
  ] = useState(false)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState("")

  const safeNextPath =
    getSafeInternalPath(
      nextPath,
      "/entry"
    )

  const clearTimers =
    useCallback(() => {
      if (safetyTimerRef.current) {
        clearTimeout(
          safetyTimerRef.current
        )

        safetyTimerRef.current = null
      }

      if (focusTimerRef.current) {
        clearTimeout(
          focusTimerRef.current
        )

        focusTimerRef.current = null
      }
    }, [])

  const resetButton =
    useCallback(
      (nextMessage = "") => {
        phaseRef.current = "idle"
        popupOpenedAtRef.current = 0

        clearTimers()

        if (!mountedRef.current) {
          return
        }

        setLoading(false)
        setMessage(nextMessage)
      },
      [clearTimers]
    )

  /*
   * Limpia temporizadores cuando el componente
   * se destruye o cambia de página.
   */
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearTimers()
    }
  }, [clearTimers])

  /*
   * Si la persona regresa desde la ventana de
   * Google sin completar el acceso, desbloquea
   * nuevamente el botón.
   */
  useEffect(() => {
    function resetAfterReturning() {
      if (
        phaseRef.current !==
          "waiting_google" ||
        document.visibilityState !==
          "visible"
      ) {
        return
      }

      const timeSinceOpen =
        Date.now() -
        popupOpenedAtRef.current

      /*
       * Evita interpretar el pequeño cambio
       * de foco inicial como un regreso.
       */
      if (timeSinceOpen < 1200) {
        return
      }

      if (focusTimerRef.current) {
        clearTimeout(
          focusTimerRef.current
        )
      }

      /*
       * Esperamos un momento porque Google
       * puede estar a punto de entregar el código.
       */
      focusTimerRef.current =
        setTimeout(() => {
          if (
            phaseRef.current ===
            "waiting_google"
          ) {
            resetButton("")
          }
        }, 700)
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        resetAfterReturning()
      }
    }

    /*
     * También corrige páginas recuperadas desde
     * la caché de Atrás/Adelante del navegador.
     */
    function handlePageShow() {
      if (
        phaseRef.current !==
        "idle"
      ) {
        resetButton("")
      }
    }

    window.addEventListener(
      "focus",
      resetAfterReturning
    )

    window.addEventListener(
      "pageshow",
      handlePageShow
    )

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    )

    return () => {
      window.removeEventListener(
        "focus",
        resetAfterReturning
      )

      window.removeEventListener(
        "pageshow",
        handlePageShow
      )

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      )
    }
  }, [resetButton])

  async function completeGoogleSignIn(
    code: string
  ) {
    const controller =
      new AbortController()

    /*
     * Evita que la petición interna deje el
     * botón cargando indefinidamente.
     */
    const requestTimeout =
      setTimeout(() => {
        controller.abort()
      }, 20000)

    try {
      const response = await fetch(
        "/api/auth/google",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Requested-With":
              "XMLHttpRequest",
          },

          body: JSON.stringify({
            code,
          }),

          signal: controller.signal,
        }
      )

      const result =
        (await response.json()) as {
          success?: boolean
          error?: string
        }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "No se pudo completar el acceso con Google."
        )
      }

      window.location.assign(
        safeNextPath
      )
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        throw new Error(
          "La conexión con Google tardó demasiado. Inténtalo nuevamente."
        )
      }

      throw error
    } finally {
      clearTimeout(requestTimeout)
    }
  }

  function initializeGoogle() {
    const clientId =
      process.env
        .NEXT_PUBLIC_GOOGLE_CLIENT_ID

    const oauth2 =
      window.google?.accounts.oauth2

    if (!clientId || !oauth2) {
      setGoogleReady(false)

      setMessage(
        "Falta completar la configuración de Google."
      )

      return
    }

    codeClientRef.current =
      oauth2.initCodeClient({
        client_id: clientId,

        scope:
          "openid email profile",

        ux_mode: "popup",

        select_account: true,

        callback: (response) => {
          if (
            response.error ||
            !response.code
          ) {
            resetButton(
              "Google no pudo completar el acceso. Inténtalo nuevamente."
            )

            return
          }

          /*
           * El código llegó correctamente.
           * Ya no debemos resetear por foco.
           */
          phaseRef.current =
            "exchanging"

          clearTimers()
          setLoading(true)
          setMessage("")

          void completeGoogleSignIn(
            response.code
          ).catch(
            (error: unknown) => {
              console.error(
                "Error al completar Google:",
                error
              )

              resetButton(
                error instanceof Error
                  ? error.message
                  : "No se pudo completar el acceso con Google."
              )
            }
          )
        },

        error_callback: (error) => {
          if (
            error.type ===
            "popup_closed"
          ) {
            resetButton("")
            return
          }

          if (
            error.type ===
            "popup_failed_to_open"
          ) {
            resetButton(
              "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo nuevamente."
            )

            return
          }

          resetButton(
            "No se pudo abrir Google. Inténtalo nuevamente."
          )
        },
      })

    setMessage("")
    setGoogleReady(true)
  }

  function handleGoogleSignIn() {
    if (loading) {
      return
    }

    if (!codeClientRef.current) {
      setMessage(
        "Google todavía está cargando. Inténtalo nuevamente en un momento."
      )

      return
    }

    phaseRef.current =
      "waiting_google"

    popupOpenedAtRef.current =
      Date.now()

    setLoading(true)
    setMessage("")

    /*
     * Protección final: aunque el navegador no
     * avise que Google se cerró o dejó de responder,
     * el botón nunca quedará bloqueado para siempre.
     */
    safetyTimerRef.current =
      setTimeout(() => {
        if (
          phaseRef.current ===
          "waiting_google"
        ) {
          resetButton("")
        }
      }, 90000)

    try {
      codeClientRef.current
        .requestCode()
    } catch (error) {
      console.error(
        "No se pudo abrir Google:",
        error
      )

      resetButton(
        "No se pudo abrir Google. Inténtalo nuevamente."
      )
    }
  }

  return (
    <div className="space-y-3 font-serif">
      <Script
        src="https://accounts.google.com/gsi/client?hl=es"
        strategy="afterInteractive"
        onReady={initializeGoogle}
      />

      {/*
        Se mantienen exactamente las mismas
        clases visuales del botón actual.
      */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={
          loading ||
          !googleReady
        }
        aria-busy={loading}
        className="telegram-button flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-6 py-4 text-base font-normal disabled:cursor-wait disabled:opacity-60"
      >
        <GoogleIcon />

        <span>
          {loading
            ? "Conectando con Google..."
            : label}
        </span>
      </button>

      {message && (
        <p
          className="text-sm leading-6 text-red-300"
          role="alert"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  )
}