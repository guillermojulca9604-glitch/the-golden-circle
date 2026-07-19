"use client"

import {
  useEffect,
  useState,
} from "react"

type Props = {
  paymentId: string | null
}

const PAYMENT_RETURN_CHECK_KEY =
  "tgc:payment-return-check"

function clearPaymentReturnFlag() {
  try {
    window.sessionStorage.removeItem(
      PAYMENT_RETURN_CHECK_KEY
    )
  } catch {
    /*
     * La navegación continúa aunque
     * sessionStorage esté bloqueado.
     */
  }
}

export function PaymentSuccessWaiter({
  paymentId,
}: Props) {
  const [
    seconds,
    setSeconds,
  ] = useState(0)

  useEffect(() => {
    let cancelled = false

    let timeoutId:
      | number
      | undefined

    let attempts = 0
    let redirecting = false

    const goHome = () => {
      if (redirecting) {
        return
      }

      redirecting = true
      clearPaymentReturnFlag()

      /*
       * La sesión de TGC ya no existe.
       * Regresamos directamente al Inicio.
       */
      window.location.replace("/")
    }

    const goVip = () => {
      if (redirecting) {
        return
      }

      redirecting = true
      clearPaymentReturnFlag()

      /*
       * Reemplazamos la pantalla de
       * verificación para que el flujo
       * continúe desde VIP.
       */
      window.location.replace("/vip")
    }

    const confirmReturnedPayment =
      async () => {
        if (
          !paymentId ||
          cancelled ||
          redirecting
        ) {
          return
        }

        try {
          const response =
            await fetch(
              "/api/mercadopago/confirm-payment",
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
                    paymentId,
                  }),
              }
            )

          if (
            response.status === 401
          ) {
            goHome()
            return
          }

          if (!response.ok) {
            return
          }

          const data =
            (await response.json()) as {
              active?: boolean
            }

          if (data.active) {
            goVip()
          }
        } catch {
          /*
           * El próximo intento volverá
           * a consultar el pago.
           */
        }
      }

    const checkMembership =
      async () => {
        if (
          cancelled ||
          redirecting
        ) {
          return
        }

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
            goHome()
            return
          }

          if (!response.ok) {
            return
          }

          const data =
            (await response.json()) as {
              active?: boolean
            }

          if (data.active) {
            goVip()
          }
        } catch {
          /*
           * El próximo intento volverá
           * a comprobar la membresía.
           */
        }
      }

    const check = async () => {
      if (
        cancelled ||
        redirecting
      ) {
        return
      }

      attempts += 1

      /*
       * Consultamos directamente el pago
       * al entrar y después cada cinco
       * segundos.
       */
      if (
        paymentId &&
        (
          attempts === 1 ||
          attempts % 5 === 0
        )
      ) {
        await confirmReturnedPayment()
      }

      if (
        cancelled ||
        redirecting
      ) {
        return
      }

      /*
       * También comprobamos si el webhook
       * ya activó la membresía.
       */
      await checkMembership()

      if (
        cancelled ||
        redirecting
      ) {
        return
      }

      setSeconds(attempts)

      if (attempts < 90) {
        timeoutId =
          window.setTimeout(
            check,
            1000
          )
      } else {
        window.location.replace(
          "/payment-pending"
        )
      }
    }

    void check()

    return () => {
      cancelled = true

      if (timeoutId) {
        window.clearTimeout(
          timeoutId
        )
      }
    }
  }, [paymentId])

  return (
    <p className="mt-6 text-xs leading-6 text-muted-foreground">
      Activando acceso...{" "}
      {seconds}s
    </p>
  )
}