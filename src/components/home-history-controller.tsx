"use client"

import {
  useEffect,
  useRef,
} from "react"

const FLOW_FROM_HOME_KEY =
  "tgc:flow-from-home"

const LOGOUT_CLEANUP_KEY =
  "tgc:logout-cleanup"

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  )
}

export function HomeHistoryController() {
  const transitionRef =
    useRef<HTMLDivElement>(null)

  const redirectingRef =
    useRef(false)

  useEffect(() => {
    const markHomeEntry = () => {
      const currentState =
        isObject(window.history.state)
          ? window.history.state
          : {}

      /*
       * Conservamos cualquier información interna
       * que Next.js ya haya guardado.
       */
      window.history.replaceState(
        {
          ...currentState,
          __tgcHome: true,
        },
        "",
        window.location.href
      )
    }

    const showLogoutTransition = () => {
      const transition =
        transitionRef.current

      if (!transition) {
        return
      }

      /*
       * Mostramos inmediatamente una capa completa
       * antes de abrir nuevamente Login.
       */
      transition.style.visibility =
        "visible"

      transition.style.opacity = "1"

      transition.style.pointerEvents =
        "auto"

      transition.setAttribute(
        "aria-hidden",
        "false"
      )

      document.documentElement.style.backgroundColor =
        "#050505"

      document.body.style.backgroundColor =
        "#050505"

      document.body.style.overflow =
        "hidden"
    }

    const finishLogoutCleanup = () => {
      const cleanupState =
        window.sessionStorage.getItem(
          LOGOUT_CLEANUP_KEY
        )

      if (
        cleanupState !== "pending" ||
        redirectingRef.current
      ) {
        return
      }

      redirectingRef.current = true

      /*
       * Antes de hacer cualquier navegación,
       * ocultamos completamente la portada.
       */
      showLogoutTransition()

      /*
       * Cambiamos el estado para impedir que useEffect
       * y pageshow ejecuten la redirección dos veces.
       */
      window.sessionStorage.setItem(
        LOGOUT_CLEANUP_KEY,
        "finishing"
      )

      window.sessionStorage.removeItem(
        FLOW_FROM_HOME_KEY
      )

      /*
       * Esperamos dos fotogramas.
       *
       * Esto permite que el navegador dibuje primero
       * la pantalla de transición y después abra Login,
       * evitando que Inicio aparezca durante una fracción
       * de segundo.
       */
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.location.assign(
            "/access?step=login&from=logout"
          )
        })
      })
    }

    const markFlowStartedFromHome = (
      event: MouseEvent
    ) => {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const link =
        target.closest("a[href]")

      if (
        !(
          link instanceof
          HTMLAnchorElement
        )
      ) {
        return
      }

      const url = new URL(
        link.href,
        window.location.href
      )

      if (
        url.origin ===
          window.location.origin &&
        url.pathname === "/access"
      ) {
        window.sessionStorage.setItem(
          FLOW_FROM_HOME_KEY,
          "1"
        )
      }
    }

    markHomeEntry()
    finishLogoutCleanup()

    document.addEventListener(
      "click",
      markFlowStartedFromHome,
      true
    )

    /*
     * pageshow se ejecuta también cuando Inicio
     * reaparece mediante Atrás o desde la caché
     * de navegación del navegador.
     */
    window.addEventListener(
      "pageshow",
      finishLogoutCleanup
    )

    return () => {
      document.removeEventListener(
        "click",
        markFlowStartedFromHome,
        true
      )

      window.removeEventListener(
        "pageshow",
        finishLogoutCleanup
      )
    }
  }, [])

  return (
    <div
      ref={transitionRef}
      aria-hidden="true"
      aria-live="polite"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-[#050505] px-6"
      style={{
        opacity: 0,
        visibility: "hidden",
        pointerEvents: "none",
        transition:
          "opacity 120ms ease-out",
      }}
    >
      <div className="text-center">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </div>

        <p className="text-xs uppercase tracking-[0.4em] text-gold">
          The Golden Circle
        </p>

        <p className="mt-4 text-sm text-white/60">
          Cerrando sesión...
        </p>
      </div>
    </div>
  )
}