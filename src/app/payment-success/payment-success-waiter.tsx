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

/*
 * La barra avanza exactamente un punto
 * por vez. El recorrido completo dura
 * aproximadamente dos segundos cuando
 * todo ya está confirmado.
 */
const PROGRESS_STEP_DELAY_MS =
  20

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
  /*
   * Progreso que realmente se muestra.
   *
   * Este valor únicamente avanza:
   * 0, 1, 2, 3, 4...
   */
  const [
    visibleProgress,
    setVisibleProgress,
  ] = useState(0)

  /*
   * Punto hasta el que la barra tiene
   * permiso de avanzar según los estados
   * confirmados por el servidor.
   */
  const [
    targetProgress,
    setTargetProgress,
  ] = useState(0)

  const [
    progressMessage,
    setProgressMessage,
  ] = useState(
    "Preparando la confirmación..."
  )

  const [
    accessReady,
    setAccessReady,
  ] = useState(false)

  /*
   * Movimiento constante de la barra.
   *
   * Aunque el servidor cambie el objetivo
   * directamente de 12 a 84, la barra
   * visible recorre todos los números
   * intermedios uno por uno.
   */
  useEffect(() => {
    if (
      visibleProgress >=
      targetProgress
    ) {
      return
    }

    const animationId =
      window.setTimeout(
        () => {
          setVisibleProgress(
            (currentProgress) =>
              Math.min(
                currentProgress + 1,
                targetProgress
              )
          )
        },
        PROGRESS_STEP_DELAY_MS
      )

    return () => {
      window.clearTimeout(
        animationId
      )
    }
  }, [
    visibleProgress,
    targetProgress,
  ])

  /*
   * Cuando el servidor ya confirmó todo,
   * esperamos únicamente a que la barra
   * termine su recorrido hasta 100.
   */
  useEffect(() => {
    if (
      !accessReady ||
      visibleProgress < 100
    ) {
      return
    }

    const redirectId =
      window.setTimeout(
        () => {
          clearPaymentReturnFlag()

          window.location.replace(
            "/vip"
          )
        },
        150
      )

    return () => {
      window.clearTimeout(
        redirectId
      )
    }
  }, [
    accessReady,
    visibleProgress,
  ])

  useEffect(() => {
    let cancelled = false
    let redirecting = false
    let checking = false
    let finished = false

    let highestTarget = 0

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
     * El servidor solamente cambia el
     * objetivo. Nunca cambia directamente
     * el ancho visible de la barra.
     */
    const advanceTarget = (
      nextTarget: number,
      nextMessage: string
    ) => {
      if (
        cancelled ||
        redirecting ||
        nextTarget <= highestTarget
      ) {
        return
      }

      highestTarget =
        nextTarget

      setTargetProgress(
        nextTarget
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

    const completeAccess = () => {
      if (
        cancelled ||
        redirecting ||
        finished
      ) {
        return
      }

      finished = true

      advanceTarget(
        100,
        "Acceso confirmado. Entrando al área VIP..."
      )

      /*
       * La redirección se realizará cuando
       * la barra visible llegue naturalmente
       * a 100, avanzando punto por punto.
       */
      setAccessReady(true)
    }

    const confirmReturnedPayment =
      async () => {
        if (
          !paymentId ||
          cancelled ||
          redirecting ||
          finished
        ) {
          return
        }

        /*
         * La consulta comenzó realmente.
         * La barra parte desde cero y
         * avanza 1, 2, 3... hasta 12.
         */
        advanceTarget(
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
           * La operación fue localizada.
           *
           * El objetivo puede cambiar a 42,
           * pero la barra visible continuará:
           * 13, 14, 15... 41, 42.
           */
          if (
            typeof data.status ===
              "string" ||
            typeof data.paymentId ===
              "string"
          ) {
            advanceTarget(
              42,
              "Pago localizado."
            )
          }

          if (
            data.status ===
            "approved"
          ) {
            advanceTarget(
              68,
              "Pago aprobado."
            )
          }

          if (data.membership) {
            advanceTarget(
              84,
              "Membresía VIP activada."
            )
          }

          /*
           * Solo se autoriza el recorrido
           * final hasta 100 cuando:
           *
           * - el pago está aprobado;
           * - la membresía está activa;
           * - la preferencia quedó cerrada.
           */
          if (
            data.active &&
            data.preferenceClosed
          ) {
            completeAccess()
            return
          }

          /*
           * Un error temporal mantiene la
           * verificación. No desbloquea
           * otro pago.
           */
          if (!response.ok) {
            return
          }
        } catch {
          /*
           * Una interrupción temporal no
           * reinicia la barra. La consulta
           * se repetirá automáticamente.
           */
        }
      }

    const checkMembership =
      async () => {
        if (
          cancelled ||
          redirecting ||
          finished
        ) {
          return
        }

        /*
         * Respaldo excepcional cuando
         * Mercado Pago no devuelve
         * payment_id.
         */
        advanceTarget(
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
            advanceTarget(
              84,
              "Membresía VIP activada."
            )

            completeAccess()
          }
        } catch {
          /*
           * Se comprobará nuevamente.
           */
        }
      }

    const scheduleNextCheck =
      () => {
        clearScheduledCheck()

        if (
          cancelled ||
          redirecting ||
          finished
        ) {
          return
        }

        const elapsedMs =
          Date.now() -
          startedAt

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
          checking ||
          finished
        ) {
          return
        }

        checking = true
        clearScheduledCheck()

        try {
          const elapsedMs =
            Date.now() -
            startedAt

          /*
           * El límite sigue existiendo como
           * respaldo, pero no se muestra
           * ningún contador ni “0s”.
           */
          if (
            elapsedMs >=
            MAX_WAIT_MS
          ) {
            goPending()
            return
          }

          if (paymentId) {
            await confirmReturnedPayment()
          } else {
            await checkMembership()
          }
        } finally {
          checking = false

          if (
            !cancelled &&
            !redirecting &&
            !finished
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
          checking ||
          finished
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
        aria-valuenow={
          visibleProgress
        }
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#8f6a19,#f1d27a,#b88922)] transition-[width] duration-75 ease-linear"
          style={{
            width:
              `${visibleProgress}%`,
          }}
        />
      </div>

      <p className="text-xs leading-6 text-muted-foreground">
        {progressMessage}
      </p>
    </div>
  )
}