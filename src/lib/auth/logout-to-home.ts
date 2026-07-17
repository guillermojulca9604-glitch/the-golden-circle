import type { SupabaseClient } from "@supabase/supabase-js"

export const AUTH_EVENT_KEY = "tgc:auth-event"

const TEMPORARY_STORAGE_KEYS = [
  "tgc:flow-from-home",
  "tgc:logout-cleanup",
  "tgc:flow-anchor",
  "tgc:flow-id",
  "tgc:history-flow-id",
  "tgc:history-home-entry-key",
  "tgc:history-logout-pending",
  "tgc:history-home-url",
]

function clearTemporaryState() {
  try {
    for (const key of TEMPORARY_STORAGE_KEYS) {
      window.sessionStorage.removeItem(key)
    }
  } catch {
    /*
     * El cierre continúa aunque sessionStorage
     * esté bloqueado por el navegador.
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
     * Las demás pestañas también comprobarán
     * la sesión cuando recuperen el foco.
     */
  }
}

async function closeServerSession() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })

    return response.ok
  } catch {
    return false
  }
}

async function closeBrowserSession(
  supabase: SupabaseClient
) {
  try {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    })

    if (!error) {
      return true
    }

    return error.name === "AuthSessionMissingError"
  } catch {
    return false
  }
}

export async function logoutToHome(
  supabase: SupabaseClient
) {
  if (typeof window === "undefined") {
    return
  }

  /*
   * El logout solamente se ejecuta cuando
   * el usuario pulsa el botón Cerrar sesión.
   */
  const [serverClosed, browserClosed] =
    await Promise.all([
      closeServerSession(),
      closeBrowserSession(supabase),
    ])

  if (!serverClosed && !browserClosed) {
    throw new Error("No se pudo cerrar la sesión.")
  }

  clearTemporaryState()
  announceLogout()

  document.cookie =
    "tgc_logged_out=1; path=/; max-age=120; samesite=lax"

  /*
   * Reemplaza únicamente la pantalla actual.
   * No utiliza Atrás, Adelante ni history.go().
   */
  window.location.replace("/")
}