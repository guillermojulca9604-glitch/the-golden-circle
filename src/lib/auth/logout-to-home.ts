import type { SupabaseClient } from "@supabase/supabase-js"

export const AUTH_EVENT_KEY =
  "tgc:auth-event"

const TEMPORARY_KEYS = [
  "tgc:flow-from-home",
  "tgc:logout-cleanup",
  "tgc:flow-anchor",
  "tgc:flow-id",
]

function clearTemporaryNavigationState() {
  try {
    for (
      const key of TEMPORARY_KEYS
    ) {
      window.sessionStorage.removeItem(
        key
      )
    }
  } catch {
    /*
     * El cierre continúa aunque
     * el almacenamiento esté bloqueado.
     */
  }
}

function announceLogout() {
  try {
    window.localStorage.setItem(
      AUTH_EVENT_KEY,
      JSON.stringify({
        type: "SIGNED_OUT",
        at: Date.now(),
      })
    )
  } catch {
    /*
     * Las otras pestañas también
     * verificarán la sesión al recuperar
     * el foco.
     */
  }
}

export async function logoutToHome(
  supabase: SupabaseClient
) {
  if (
    typeof window === "undefined"
  ) {
    return
  }

  try {
    await fetch(
      "/api/auth/logout",
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    )
  } catch {
    /*
     * El cierre local se ejecuta
     * aunque la petición falle.
     */
  }

  try {
    await supabase.auth.signOut({
      scope: "local",
    })
  } catch {
    /*
     * Puede ocurrir cuando la sesión
     * ya fue eliminada por el servidor.
     */
  }

  clearTemporaryNavigationState()
  announceLogout()

  document.cookie =
    "tgc_logged_out=1; " +
    "path=/; " +
    "max-age=120; " +
    "samesite=lax"

  /*
   * Siempre termina en Inicio.
   * No agrega una nueva entrada.
   */
  window.location.replace("/")
}