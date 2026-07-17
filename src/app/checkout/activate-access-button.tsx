"use client"

import {
  useEffect,
  useState,
} from "react"

type Props = {
  plan:
    | "monthly"
    | "quarterly"
}

export function ActivateAccessButton({
  plan,
}: Props) {
  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState("")

  useEffect(() => {
    const resetOrRedirect =
      async () => {
        try {
          const response =
            await fetch(
              "/api/membership-status",
              {
                cache: "no-store",
                credentials:
                  "same-origin",
              }
            )

          if (
            response.status === 401
          ) {
            window.location.replace(
              "/"
            )

            return
          }

          if (!response.ok) {
            setLoading(false)
            return
          }

          const data =
            await response.json()

          if (data.active) {
            window.location.replace(
              "/vip"
            )

            return
          }

          setLoading(false)
        } catch {
          setLoading(false)
        }
      }

    window.addEventListener(
      "pageshow",
      resetOrRedirect
    )

    window.addEventListener(
      "focus",
      resetOrRedirect
    )

    return () => {
      window.removeEventListener(
        "pageshow",
        resetOrRedirect
      )

      window.removeEventListener(
        "focus",
        resetOrRedirect
      )
    }
  }, [])

  const handleClick =
    async () => {
      if (loading) {
        return
      }

      setLoading(true)
      setMessage("")

      try {
        const response =
          await fetch(
            "/api/mercadopago/create-preference",
            {
              method: "POST",
              credentials:
                "same-origin",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  plan,
                }),
            }
          )

        if (
          response.status === 401
        ) {
          window.location.replace(
            "/"
          )

          return
        }

        const data =
          await response.json()

        if (
          data?.url === "/vip"
        ) {
          window.location.replace(
            "/vip"
          )

          return
        }

        if (
          typeof data?.url ===
            "string" &&
          data.url.length > 0
        ) {
          window.location.assign(
            data.url
          )

          return
        }

        setLoading(false)

        setMessage(
          data?.error ||
            "No se pudo preparar el pago."
        )
      } catch {
        setLoading(false)

        setMessage(
          "No se pudo conectar con el sistema de pagos."
        )
      }
    }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-75"
      >
        {loading
          ? "Preparando pago..."
          : "Activar acceso"}
      </button>

      {message && (
        <p className="mt-4 text-xs leading-6 text-red-300">
          {message}
        </p>
      )}
    </>
  )
}