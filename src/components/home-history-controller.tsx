"use client"

import { useEffect } from "react"

const FLOW_FROM_HOME_KEY = "tgc:flow-from-home"
const LOGOUT_CLEANUP_KEY = "tgc:logout-cleanup"

const flowPaths = new Set([
  "/access",
  "/login",
  "/entry",
  "/pricing",
])

export function HomeHistoryController() {
  useEffect(() => {
    const finishLogoutCleanup = () => {
      const mustCleanHistory =
        sessionStorage.getItem(LOGOUT_CLEANUP_KEY) === "1"

      if (!mustCleanHistory) {
        return
      }

      sessionStorage.removeItem(LOGOUT_CLEANUP_KEY)
      sessionStorage.removeItem(FLOW_FROM_HOME_KEY)

      /*
       * Estamos nuevamente en Inicio.
       *
       * Al abrir Login desde esta posición, el navegador
       * elimina Precios, Checkout y todo lo que estuviera
       * hacia adelante.
       */
      window.location.assign("/access?step=login")
    }

    const markFlowStartedFromHome = (
      event: MouseEvent
    ) => {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const link = target.closest("a")

      if (!link) {
        return
      }

      const url = new URL(
        link.href,
        window.location.href
      )

      if (url.origin !== window.location.origin) {
        return
      }

      if (flowPaths.has(url.pathname)) {
        sessionStorage.setItem(
          FLOW_FROM_HOME_KEY,
          "1"
        )
      }
    }

    document.addEventListener(
      "click",
      markFlowStartedFromHome,
      true
    )

    window.addEventListener(
      "pageshow",
      finishLogoutCleanup
    )

    finishLogoutCleanup()

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

  return null
}