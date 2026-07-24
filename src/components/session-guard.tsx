"use client"

import {
  useEffect,
  useRef,
} from "react"

import { AUTH_EVENT_KEY } from "@/lib/auth/logout-to-home"
import { createClient } from "@/lib/supabase/client"

const MAXIMUM_TIMER_DELAY =
  2_147_000_000

type Props = {
  mode:
    | "pricing"
    | "checkout"
    | "vip"
    | "payment"
    | "signed-in"
}

type MembershipStatusResponse = {
  active?: boolean
  expiresAt?: string | null
  serverNow?: string
}

export function SessionGuard({
  mode,
}: Props) {
  const redirectingRef =
    useRef(false)

  const expirationTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null)

  const serverClockOffsetRef =
    useRef(0)

  useEffect(() => {
    const supabase =
      createClient()

    const clearExpirationTimer =
      () => {
        if (
          expirationTimerRef.current ===
          null
        ) {
          return
        }

        clearTimeout(
          expirationTimerRef.current
        )

        expirationTimerRef.current =
          null
      }

    const redirect = (
      url: string
    ) => {
      if (
        redirectingRef.current
      ) {
        return
      }

      redirectingRef.current =
        true

      clearExpirationTimer()

      window.location.replace(
        url
      )
    }

    const scheduleExpiration = (
      expiresAt: string | null,
      serverNow: string | null
    ) => {
      clearExpirationTimer()

      if (
        mode !== "vip" ||
        !expiresAt
      ) {
        return
      }

      const expirationTime =
        Date.parse(expiresAt)

      if (
        Number.isNaN(
          expirationTime
        )
      ) {
        return
      }

      if (serverNow) {
        const serverTime =
          Date.parse(serverNow)

        if (
          !Number.isNaN(
            serverTime
          )
        ) {
          serverClockOffsetRef.current =
            serverTime -
            Date.now()
        }
      }

      const adjustedCurrentTime =
        Date.now() +
        serverClockOffsetRef.current

      const remainingTime =
        expirationTime -
        adjustedCurrentTime

      if (remainingTime <= 0) {
        redirect("/pricing")
        return
      }

      /*
       * Los navegadores no permiten
       * temporizadores extremadamente
       * largos.
       *
       * Si falta más del máximo
       * permitido, se programa una
       * comprobación intermedia y
       * luego se vuelve a calcular.
       */
      const timerDelay =
        Math.min(
          remainingTime,
          MAXIMUM_TIMER_DELAY
        )

      const reachesExpiration =
        timerDelay ===
        remainingTime

      expirationTimerRef.current =
        setTimeout(() => {
          void check(
            reachesExpiration
          )
        }, timerDelay)
    }

    const check =
      async (
        expirationReached = false
      ) => {
        if (
          redirectingRef.current
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
            redirect("/")
            return
          }

          if (!response.ok) {
            /*
             * Si ya alcanzamos la hora
             * de vencimiento y el
             * servidor no puede
             * responder, no se mantiene
             * abierto un acceso que ya
             * debía finalizar.
             */
            if (
              expirationReached &&
              mode === "vip"
            ) {
              redirect("/pricing")
            }

            return
          }

          const data =
            (
              await response.json()
            ) as
              MembershipStatusResponse

          const active =
            Boolean(data.active)

          if (mode === "vip") {
            if (!active) {
              redirect("/pricing")
              return
            }

            scheduleExpiration(
              typeof data.expiresAt ===
                "string"
                ? data.expiresAt
                : null,
              typeof data.serverNow ===
                "string"
                ? data.serverNow
                : null
            )

            return
          }

          if (
            (
              mode === "pricing" ||
              mode === "checkout"
            ) &&
            active
          ) {
            redirect("/vip")
          }
        } catch {
          if (
            expirationReached &&
            mode === "vip"
          ) {
            redirect("/pricing")
            return
          }

          /*
           * Un fallo de red no debe cerrar
           * una sesión válida automáticamente
           * antes de que llegue el vencimiento.
           */
          try {
            const {
              data: {
                session,
              },
            } =
              await supabase.auth
                .getSession()

            if (!session) {
              redirect("/")
            }
          } catch {
            redirect("/")
          }
        }
      }

    const onPageShow = () => {
      void check()
    }

    const onFocus = () => {
      void check()
    }

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void check()
        }
      }

    const onStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key !==
          AUTH_EVENT_KEY ||
        !event.newValue
      ) {
        return
      }

      try {
        const payload =
          JSON.parse(
            event.newValue
          ) as {
            type?: string
          }

        if (
          payload.type ===
          "SIGNED_OUT"
        ) {
          redirect("/")
        }
      } catch {
        redirect("/")
      }
    }

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (event) => {
            if (
              event ===
              "SIGNED_OUT"
            ) {
              redirect("/")
            }
          }
        )

    window.addEventListener(
      "pageshow",
      onPageShow
    )

    window.addEventListener(
      "focus",
      onFocus
    )

    window.addEventListener(
      "storage",
      onStorage
    )

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    )

    void check()

    return () => {
      clearExpirationTimer()

      subscription.unsubscribe()

      window.removeEventListener(
        "pageshow",
        onPageShow
      )

      window.removeEventListener(
        "focus",
        onFocus
      )

      window.removeEventListener(
        "storage",
        onStorage
      )

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      )
    }
  }, [mode])

  return null
}