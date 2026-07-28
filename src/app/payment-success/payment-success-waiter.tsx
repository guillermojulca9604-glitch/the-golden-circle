"use client"

import {
  useEffect,
  useState,
} from "react"

type Props = {
  paymentId: string | null
}

type ConfirmPaymentResponse = {
  active?: boolean
  preferenceClosed?: boolean
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
       * Solo llegamos aquí cuando el pago
       * está aprobado, el VIP está activo
       * y la preferencia quedó cerrada.
       */
      window.location.replace(
        "/vip"
      )
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

          /*
           * Un 202, 503 u otro error temporal
           * significa que todavía no debemos
           * abandonar esta pantalla.
           */
          if (!response.ok) {
            return
          }

          const data =
            (await response
              .json()
              .catch(
                () => ({})
              )) as ConfirmPaymentResponse

          /*
           * No basta con que el VIP ya exista.
           * La operación de Mercado Pago también
           * debe haber quedado cerrada.
           */
          if (
            data.active &&
            data.preferenceClosed
          ) {
            goVip()
          }
        } catch {
          /*
           * El siguiente intento volverá
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
            (await response
              .json()
              .catch(
                () => ({})
              )) as {
                active?: boolean
              }

          if (data.active) {
            goVip()
          }
        } catch {
          /*
           * El siguiente intento volverá
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
       * Cuando Mercado Pago devuelve payment_id,
       * confirm-payment es la única ruta que puede
       * autorizar el salto final hacia VIP.
       *
       * Así evitamos avanzar únicamente porque
       * el webhook ya activó la membresía mientras
       * la preferencia todavía se está cerrando.
       */
      if (paymentId) {
        if (
          attempts === 1 ||
          attempts % 5 === 0
        ) {
          await confirmReturnedPayment()
        }
      } else {
        /*
         * Respaldo para un regreso excepcional
         * que no incluya payment_id.
         */
        await checkMembership()
      }

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
        /*
         * Después de noventa segundos no
         * permitimos otro pago automáticamente.
         * Se envía a la pantalla pendiente.
         */
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