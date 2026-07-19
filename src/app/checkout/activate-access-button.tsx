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

type MembershipResult =
  | "active"
  | "inactive"
  | "signed-out"
  | "error"

const PAYMENT_RETURN_CHECK_KEY =
  "tgc:payment-return-check"

function setPaymentReturnFlag() {
  try {
    window.sessionStorage
      .setItem(
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
    window.sessionStorage
      .removeItem(
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
      window.sessionStorage
        .getItem(
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

  useEffect(() => {
    let cancelled = false

    let timeoutId:
      | number
      | undefined

    let verificationId = 0

    const checkMembership =
      async (): Promise<MembershipResult> => {
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
            return "signed-out"
          }

          if (!response.ok) {
            return "error"
          }

          const data =
            (await response.json()) as {
              active?: boolean
            }

          return data.active
            ? "active"
            : "inactive"
        } catch {
          return "error"
        }
      }

    const handleResult = (
      result: MembershipResult
    ) => {
      if (
        result === "signed-out"
      ) {
        clearPaymentReturnFlag()

        window.location.replace(
          "/"
        )

        return true
      }

      if (
        result === "active"
      ) {
        clearPaymentReturnFlag()

        window.location.replace(
          "/vip"
        )

        return true
      }

      return false
    }

    const checkOnce =
      async () => {
        const result =
          await checkMembership()

        if (cancelled) {
          return
        }

        if (
          !handleResult(result)
        ) {
          setLoading(false)
        }
      }

    const verifyPaymentReturn =
      () => {
        /*
         * En una visita normal
         * solo hacemos una revisión.
         */
        if (
          !hasPaymentReturnFlag()
        ) {
          void checkOnce()
          return
        }

        verificationId += 1

        const currentVerification =
          verificationId

        if (timeoutId) {
          window.clearTimeout(
            timeoutId
          )
        }

        setCheckingReturn(true)
        setLoading(false)
        setMessage("")

        let attempts = 0

        const run =
          async () => {
            if (
              cancelled ||
              currentVerification !==
                verificationId
            ) {
              return
            }

            attempts += 1

            const result =
              await checkMembership()

            if (
              cancelled ||
              currentVerification !==
                verificationId
            ) {
              return
            }

            if (
              handleResult(result)
            ) {
              return
            }

            /*
             * Verificamos durante
             * diez segundos para
             * cubrir un webhook que
             * llegue con retraso.
             */
            if (attempts < 10) {
              timeoutId =
                window.setTimeout(
                  run,
                  1000
                )

              return
            }

            clearPaymentReturnFlag()
            setCheckingReturn(false)
            setLoading(false)
          }

        void run()
      }

    const onPageShow = () => {
      verifyPaymentReturn()
    }

    const onFocus = () => {
      if (
        hasPaymentReturnFlag()
      ) {
        verifyPaymentReturn()
      }
    }

    /*
     * Comprueba la membresía
     * al cargar Checkout.
     */
    verifyPaymentReturn()

    window.addEventListener(
      "pageshow",
      onPageShow
    )

    window.addEventListener(
      "focus",
      onFocus
    )

    return () => {
      cancelled = true
      verificationId += 1

      if (timeoutId) {
        window.clearTimeout(
          timeoutId
        )
      }

      window.removeEventListener(
        "pageshow",
        onPageShow
      )

      window.removeEventListener(
        "focus",
        onFocus
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
          (await response.json()) as {
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

        if (
          typeof data.url ===
            "string" &&
          data.url.length > 0
        ) {
          /*
           * Señala que esta pestaña
           * salió hacia Mercado Pago.
           * Al regresar a Checkout
           * se abre una ventana breve
           * de verificación.
           */
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