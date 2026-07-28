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
  accessReady?: boolean
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
 * La barra avanza un punto por vez.
 *
 * Un recorrido completo desde cero
 * dura aproximadamente dos segundos
 * cuando todo ya está confirmado.
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
   * Progreso realmente visible.
   *
   * Siempre avanza:
   * 0, 1, 2, 3, 4...
   */
  const [
    visibleProgress,
    setVisibleProgress,
  ] = useState(0)

  /*
   * Límite confirmado por el servidor
   * hasta el cual puede avanzar.
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
   * Movimiento uniforme.
   *
   * Aunque el servidor confirme varias
   * etapas simultáneamente, la barra
   * recorre todos los puntos intermedios.
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
   * Entramos a VIP cuando:
   *
   * - el servidor confirmó el acceso;
   * - la barra terminó su recorrido.
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
     * El servidor modifica solamente
     * el destino de la barra.
     *
     * El ancho visible nunca cambia
     * bruscamente.
     */
    const advanceTarget = (
      nextTarget: number,
      nextMessage: string
    ) => {
      if (
        cancelled ||
        redirecting ||
        nextTarget <=
          highestTarget
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

      /*
       * Ya no esperamos que la pantalla
       * confirme el cierre de la preferencia.
       *
       * El pago y la membresía ya fueron
       * validados. El cierre continúa en
       * segundo plano y en el webhook.
       */
      advanceTarget(
        100,
        "Acceso confirmado. Entrando al área VIP..."
      )

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
         * La primera consulta ya empezó.
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
           * El servidor localizó información
           * sobre la operación.
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

          /*
           * Mercado Pago confirmó
           * el estado aprobado.
           */
          if (
            data.status ===
            "approved"
          ) {
            advanceTarget(
              68,
              "Pago aprobado."
            )
          }

          /*
           * La membresía ya fue registrada
           * en The Golden Circle.
           */
          if (data.membership) {
            advanceTarget(
              84,
              "Membresía VIP activada."
            )
          }

          /*
           * La entrada depende ahora de:
           *
           * - pago validado;
           * - membresía activa.
           *
           * El cierre de la preferencia
           * no bloquea visualmente al usuario.
           */
          if (
            data.active &&
            data.accessReady
          ) {
            completeAccess()
            return
          }

          /*
           * Un error temporal mantiene
           * la comprobación activa.
           */
          if (!response.ok) {
            return
          }
        } catch {
          /*
           * Una interrupción temporal no
           * reinicia la barra.
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
           * Se volverá a comprobar.
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
           * Respaldo para una operación
           * excepcionalmente demorada.
           *
           * No se muestra un contador.
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
     * Primera comprobación inmediata.
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