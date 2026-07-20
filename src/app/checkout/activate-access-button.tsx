"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

type Props = {
  plan:
    | "monthly"
    | "quarterly"
}

type MembershipResponse = {
  active?: boolean
  verificationPending?: boolean
  error?: string
}

const PAYMENT_RETURN_CHECK_KEY =
  "tgc:payment-return-check"

function setPaymentReturnFlag() {
  try {
    window.sessionStorage.setItem(
      PAYMENT_RETURN_CHECK_KEY,
      "1"
    )
  } catch {
    /*
     * El pago puede continuar
     * aunque storage esté bloqueado.
     */
  }
}

function clearPaymentReturnFlag() {
  try {
    window.sessionStorage.removeItem(
      PAYMENT_RETURN_CHECK_KEY
    )
  } catch {
    /*
     * No interrumpimos
     * la navegación.
     */
  }
}

function hasPaymentReturnFlag() {
  try {
    return (
      window.sessionStorage.getItem(
        PAYMENT_RETURN_CHECK_KEY
      ) === "1"
    )
  } catch {
    return false
  }
}

export function ActivateAccessButton({
  plan,
}: Props) {
  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    checkingReturn,
    setCheckingReturn,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState("")

  const checkingRef =
    useRef(false)

  const redirectingRef =
    useRef(false)

  useEffect(() => {
    let cancelled = false

    let retryId:
      | number
      | undefined

    const clearRetry = () => {
      if (retryId) {
        window.clearTimeout(
          retryId
        )

        retryId = undefined
      }
    }

    const goHome = () => {
      if (
        redirectingRef.current
      ) {
        return
      }

      redirectingRef.current =
        true

      clearPaymentReturnFlag()

      window.location.replace("/")
    }

    const goVip = () => {
      if (
        redirectingRef.current
      ) {
        return
      }

      redirectingRef.current =
        true

      clearPaymentReturnFlag()

      window.location.replace(
        "/vip"
      )
    }

    const scheduleRetry = (
      secondPass: boolean
    ) => {
      clearRetry()

      retryId =
        window.setTimeout(
          () => {
            void verifyMembership(
              secondPass
            )
          },
          1000
        )
    }

    const verifyMembership =
      async (
        secondPass = false
      ) => {
        if (
          cancelled ||
          redirectingRef.current ||
          checkingRef.current
        ) {
          return
        }

        const returningFromPayment =
          hasPaymentReturnFlag()

        if (
          returningFromPayment
        ) {
          setCheckingReturn(true)
        }

        checkingRef.current =
          true

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
            cancelled ||
            redirectingRef.current
          ) {
            return
          }

          if (
            response.status === 401
          ) {
            goHome()
            return
          }

          const data =
            (await response
              .json()
              .catch(
                () => ({})
              )) as MembershipResponse

          if (
            response.ok &&
            data.active
          ) {
            goVip()
            return
          }

          /*
           * Si no pudimos comprobar el
           * pago con seguridad, el botón
           * permanece bloqueado. Es mejor
           * esperar que arriesgar un segundo
           * cobro.
           */
          if (
            returningFromPayment &&
            (
              response.status ===
                503 ||
              data.verificationPending
            )
          ) {
            scheduleRetry(
              secondPass
            )

            return
          }

          if (
            returningFromPayment &&
            !response.ok
          ) {
            scheduleRetry(
              secondPass
            )

            return
          }

          /*
           * Al regresar desde Mercado Pago
           * hacemos una segunda comprobación
           * breve. No existe la espera fija
           * de diez segundos anterior.
           */
          if (
            returningFromPayment &&
            !secondPass
          ) {
            clearRetry()

            retryId =
              window.setTimeout(
                () => {
                  void verifyMembership(
                    true
                  )
                },
                700
              )

            return
          }

          /*
           * Dos comprobaciones confirmaron
           * que todavía no existe un pago
           * aprobado. Checkout vuelve a su
           * funcionamiento normal.
           */
          if (
            returningFromPayment
          ) {
            clearPaymentReturnFlag()
          }

          setCheckingReturn(false)
        } catch {
          if (
            returningFromPayment
          ) {
            scheduleRetry(
              secondPass
            )
          }
        } finally {
          checkingRef.current =
            false
        }
      }

    const onPageShow = () => {
      void verifyMembership(false)
    }

    const onFocus = () => {
      if (
        hasPaymentReturnFlag()
      ) {
        void verifyMembership(false)
      }
    }

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
            "visible" &&
          hasPaymentReturnFlag()
        ) {
          void verifyMembership(false)
        }
      }

    void verifyMembership(false)

    window.addEventListener(
      "pageshow",
      onPageShow
    )

    window.addEventListener(
      "focus",
      onFocus
    )

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    )

    return () => {
      cancelled = true
      clearRetry()

      window.removeEventListener(
        "pageshow",
        onPageShow
      )

      window.removeEventListener(
        "focus",
        onFocus
      )

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      )
    }
  }, [])

  const handleClick =
    async () => {
      if (
        loading ||
        checkingReturn
      ) {
        return
      }

      setLoading(true)
      setMessage("")

      try {
        /*
         * Aunque Checkout haya sido
         * recuperado desde la caché,
         * esta API vuelve a comprobar
         * el pago antes de devolver o
         * crear una preferencia.
         */
        const response =
          await fetch(
            "/api/mercadopago/create-preference",
            {
              method: "POST",
              cache: "no-store",
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
          clearPaymentReturnFlag()

          window.location.replace(
            "/"
          )

          return
        }

        const data =
          (await response
            .json()
            .catch(
              () => ({})
            )) as {
              url?: string
              error?: string
            }

        if (
          data.url === "/vip"
        ) {
          clearPaymentReturnFlag()

          window.location.replace(
            "/vip"
          )

          return
        }

        if (!response.ok) {
          setLoading(false)

          setMessage(
            data.error ||
              "No se pudo verificar la operación de pago."
          )

          return
        }

        if (
          typeof data.url ===
            "string" &&
          data.url.length > 0
        ) {
          setPaymentReturnFlag()

          window.location.assign(
            data.url
          )

          return
        }

        setLoading(false)

        setMessage(
          data.error ||
            "No se pudo preparar el pago."
        )
      } catch {
        setLoading(false)

        setMessage(
          "No se pudo conectar con el sistema de pagos."
        )
      }
    }

  const buttonLabel =
    checkingReturn
      ? "Verificando pago..."
      : loading
        ? "Preparando pago..."
        : "Activar acceso"

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={
          loading ||
          checkingReturn
        }
        className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-75"
      >
        {buttonLabel}
      </button>

      {message && (
        <p className="mt-4 text-xs leading-6 text-red-300">
          {message}
        </p>
      )}
    </>
  )
}