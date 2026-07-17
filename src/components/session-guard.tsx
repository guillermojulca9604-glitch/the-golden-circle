"use client"

import {
  useEffect,
  useRef,
} from "react"

import { AUTH_EVENT_KEY } from "@/lib/auth/logout-to-home"
import { createClient } from "@/lib/supabase/client"

type Props = {
  mode:
    | "pricing"
    | "checkout"
    | "vip"
    | "payment"
    | "signed-in"
}

export function SessionGuard({
  mode,
}: Props) {
  const redirectingRef =
    useRef(false)

  useEffect(() => {
    const supabase =
      createClient()

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

      window.location.replace(
        url
      )
    }

    const check =
      async () => {
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
            return
          }

          const data =
            await response.json()

          const active =
            Boolean(data.active)

          if (
            mode === "vip" &&
            !active
          ) {
            redirect("/pricing")
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
          /*
           * Un fallo de red no debe cerrar
           * una sesión válida automáticamente.
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