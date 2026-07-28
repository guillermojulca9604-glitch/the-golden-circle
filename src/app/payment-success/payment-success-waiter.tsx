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
  membership?: unknown
  status?: string | null
  paymentId?: string
  error?: string
}

const PAYMENT_RETURN_CHECK_KEY =
  "tgc:payment-return-check"

const MAX_WAIT_MS =
  90 * 1000

const FAST_CHECK_WINDOW_MS =
  15 * 1000

const FAST_CHECK_INTERVAL_MS =
  1000

const NORMAL_CHECK_INTERVAL_MS =
  2500

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
    progress,
    setProgress,
  ] = useState(0)

  const [
    progressMessage,
    setProgressMessage,
  ] = useState(
    "Preparando la confirmación..."
  )

  useEffect(() => {
    let cancelled = false
    let redirecting = false
    let checking = false

    let highestProgress = 0

    let timeoutId:
      | number
      | undefined

    const startedAt =
      Date.now()

    const clearScheduledCheck =
      () => {
        if (
          timeoutId !== undefined
        ) {
          window.clearTimeout(
            timeoutId
          )

          timeoutId = undefined
        }
      }

    /*
     * La barra nunca retrocede.
     *
     * Cada etapa nueva cambia el destino
     * de la animación y el navegador se
     * desplaza suavemente hasta allí.
     */
    const advanceProgress = (
      nextProgress: number,
      nextMessage: string
    ) => {
      if (
        cancelled ||
        redirecting ||
        nextProgress <=
          highestProgress
      ) {
        return
      }

      highestProgress =
        nextProgress

      setProgress(
        nextProgress
      )

      setProgressMessage(
        nextMessage
      )
    }

    const goHome = () => {
      if (redirecting) {
        return
      }

      redirecting = true
      clearScheduledCheck()
      clearPaymentReturnFlag()

      window.location.replace("/")
    }

    const goVip = () => {
      if (redirecting) {
        return
      }

      redirecting = true
      clearScheduledCheck()
      clearPaymentReturnFlag()

      /*
       * No esperamos a que la animación
       * termine visualmente.
       *
       * Apenas el servidor confirma todo,
       * entramos directamente al área VIP.
       */
      window.location.replace(
        "/vip"
      )
    }

    const goPending = () => {
      if (redirecting) {
        return
      }

      redirecting = true
      clearScheduledCheck()
      clearPaymentReturnFlag()

      window.location.replace(
        "/payment-pending"
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

        /*
         * La página ya inició una consulta
         * real. La barra parte desde cero
         * y se mueve suavemente hasta aquí.
         */
        advanceProgress(
          12,
          "Consultando la operación..."
        )

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

          const data =
            (await response
              .json()
              .catch(
                () => ({})
              )) as ConfirmPaymentResponse

          /*
           * El servidor encontró información
           * real sobre esta operación.
           */
          if (
            typeof data.status ===
              "string" ||
            typeof data.paymentId ===
              "string"
          ) {
            advanceProgress(
              42,
              "Pago localizado."
            )
          }

          /*
           * Mercado Pago confirmó que
           * el pago está aprobado.
           */
          if (
            data.status ===
            "approved"
          ) {
            advanceProgress(
              68,
              "Pago aprobado."
            )
          }

          /*
           * La membresía ya existe en
           * The Golden Circle.
           */
          if (data.membership) {
            advanceProgress(
              84,
              "Membresía VIP activada."
            )
          }

          /*
           * Solo se completa cuando:
           *
           * - el pago está aprobado;
           * - la membresía está activa;
           * - la preferencia quedó cerrada.
           */
          if (
            data.active &&
            data.preferenceClosed
          ) {
            advanceProgress(
              100,
              "Acceso confirmado."
            )

            goVip()
            return
          }

          /*
           * Un error temporal no permite
           * otro pago ni rompe la operación.
           * La consulta se repetirá.
           */
          if (!response.ok) {
            return
          }
        } catch {
          /*
           * Si hay una interrupción temporal,
           * se vuelve a consultar sin reiniciar
           * la barra.
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

        /*
         * Respaldo excepcional para un
         * regreso sin payment_id.
         */
        advanceProgress(
          12,
          "Comprobando tu membresía..."
        )

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
            advanceProgress(
              84,
              "Membresía VIP activada."
            )

            advanceProgress(
              100,
              "Acceso confirmado."
            )

            goVip()
          }
        } catch {
          /*
           * Se volverá a comprobar.
           */
        }
      }

    const scheduleNextCheck =
      () => {
        clearScheduledCheck()

        if (
          cancelled ||
          redirecting
        ) {
          return
        }

        const elapsedMs =
          Date.now() -
          startedAt

        /*
         * Los primeros segundos se revisan
         * con mayor frecuencia.
         *
         * Después se reduce el ritmo para no
         * realizar solicitudes innecesarias.
         */
        const interval =
          elapsedMs <
          FAST_CHECK_WINDOW_MS
            ? FAST_CHECK_INTERVAL_MS
            : NORMAL_CHECK_INTERVAL_MS

        timeoutId =
          window.setTimeout(
            () => {
              void runCheck()
            },
            interval
          )
      }

    const runCheck =
      async () => {
        if (
          cancelled ||
          redirecting ||
          checking
        ) {
          return
        }

        checking = true
        clearScheduledCheck()

        try {
          const elapsedMs =
            Date.now() -
            startedAt

          if (
            elapsedMs >=
            MAX_WAIT_MS
          ) {
            goPending()
            return
          }

          /*
           * La primera comprobación ocurre
           * inmediatamente al cargar.
           */
          if (paymentId) {
            await confirmReturnedPayment()
          } else {
            await checkMembership()
          }
        } finally {
          checking = false

          if (
            !cancelled &&
            !redirecting
          ) {
            scheduleNextCheck()
          }
        }
      }

    const checkImmediately =
      () => {
        if (
          cancelled ||
          redirecting ||
          checking
        ) {
          return
        }

        clearScheduledCheck()
        void runCheck()
      }

    const handlePageShow =
      () => {
        checkImmediately()
      }

    const handleFocus =
      () => {
        checkImmediately()
      }

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          checkImmediately()
        }
      }

    /*
     * Primera consulta inmediata.
     */
    void runCheck()

    /*
     * Cuando se regresa mediante Atrás,
     * Adelante o la caché del navegador,
     * comprobamos nuevamente sin reiniciar
     * el progreso alcanzado.
     */
    window.addEventListener(
      "pageshow",
      handlePageShow
    )

    window.addEventListener(
      "focus",
      handleFocus
    )

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    )

    return () => {
      cancelled = true
      clearScheduledCheck()

      window.removeEventListener(
        "pageshow",
        handlePageShow
      )

      window.removeEventListener(
        "focus",
        handleFocus
      )

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      )
    }
  }, [paymentId])

  return (
    <div
      className="mt-7 space-y-4"
      aria-live="polite"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Confirmando acceso VIP
      </p>

      <div
        className="h-2 w-full overflow-hidden rounded-full border border-amber-200/20 bg-white/5"
        role="progressbar"
        aria-label="Progreso de confirmación del pago"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#8f6a19,#f1d27a,#b88922)] transition-[width] duration-1100 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: `${progress}%`,
          }}
        >
          <div className="absolute inset-y-0 right-0 w-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] opacity-70 animate-pulse" />
        </div>
      </div>

      <p className="text-xs leading-6 text-muted-foreground">
        {progressMessage}
      </p>
    </div>
  )
}