"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Step = "login" | "register" | "pricing" | "checkout" | "vip"
type Plan = "monthly" | "quarterly"

type Props = {
  initialStep: string
  initialPlan: Plan
  initialEmail: string | null
}

const prices = {
  monthly: {
    label: "Mensual",
    price: "S/ 30",
  },
  quarterly: {
    label: "Trimestral",
    price: "S/ 90",
  },
}

const validSteps: Step[] = [
  "login",
  "register",
  "pricing",
  "checkout",
  "vip",
]

export function AccessFlow({
  initialStep,
  initialPlan,
  initialEmail,
}: Props) {
  const supabase = createClient()

  const [step, setStep] = useState<Step>(
    validSteps.includes(initialStep as Step)
      ? (initialStep as Step)
      : "login"
  )

  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [email, setEmail] = useState(initialEmail || "")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const buildUrl = useCallback(
    (nextStep: Step, nextPlan: Plan) => {
      if (nextStep === "checkout") {
        return `/access?step=checkout&plan=${nextPlan}`
      }

      return `/access?step=${nextStep}`
    },
    []
  )

  /*
   * Todos los pasos internos usan replaceState.
   *
   * Login → Precios → Checkout
   *
   * no crean nuevas entradas dentro del historial.
   */
  const replace = useCallback(
    (nextStep: Step, nextPlan: Plan = plan) => {
      setStep(nextStep)
      setPlan(nextPlan)
      setMessage("")
      setLoading(false)

      window.history.replaceState(
        {
          step: nextStep,
          plan: nextPlan,
        },
        "",
        buildUrl(nextStep, nextPlan)
      )
    },
    [buildUrl, plan]
  )

  /*
   * Mantiene sincronizada la pantalla cuando el usuario
   * utiliza las flechas del navegador.
   */
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search)

      const urlStep = params.get("step") as Step | null

      const urlPlan: Plan =
        params.get("plan") === "quarterly"
          ? "quarterly"
          : "monthly"

      setPlan(urlPlan)
      setMessage("")
      setLoading(false)

      if (urlStep && validSteps.includes(urlStep)) {
        setStep(urlStep)
        return
      }

      setStep("login")
    }

    window.addEventListener("popstate", onPopState)

    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [])

  /*
   * Comprueba la sesión cuando la página carga,
   * recupera el foco o reaparece desde el historial.
   */
  useEffect(() => {
    const checkMembership = async () => {
      try {
        const response = await fetch("/api/membership-status", {
          cache: "no-store",
        })

        if (response.status === 401) {
          if (step !== "login" && step !== "register") {
            replace("login")
          }

          return
        }

        const data = await response.json()

        if (data.active) {
          window.location.replace("/vip")
          return
        }

        setLoading(false)
      } catch {
        setLoading(false)
      }
    }

    window.addEventListener("pageshow", checkMembership)
    window.addEventListener("focus", checkMembership)

    checkMembership()

    return () => {
      window.removeEventListener("pageshow", checkMembership)
      window.removeEventListener("focus", checkMembership)
    }
  }, [replace, step])

  const login = async () => {
    if (!email.trim() || !password) {
      setMessage("Completa correo y contraseña.")
      return
    }

    setLoading(true)
    setMessage("Procesando...")

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setLoading(false)
      setMessage("Correo o contraseña incorrectos.")
      return
    }

    document.cookie =
      "tgc_logged_out=; path=/; max-age=0; samesite=lax"

    try {
      const statusResponse = await fetch(
        "/api/membership-status",
        {
          cache: "no-store",
        }
      )

      const statusData = await statusResponse.json()

      if (statusData.active) {
        window.location.replace("/vip")
        return
      }

      replace("pricing")
    } catch {
      setLoading(false)
      setMessage(
        "La sesión inició, pero no se pudo comprobar la membresía."
      )
    }
  }

  const register = async () => {
    if (!email.trim() || !password) {
      setMessage("Completa correo y contraseña.")
      return
    }

    setLoading(true)
    setMessage("Creando cuenta...")

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/access?step=pricing`,
      },
    })

    if (error) {
      setLoading(false)
      setMessage("No se pudo crear la cuenta.")
      return
    }

    setLoading(false)
    setMessage(
      "Cuenta creada. Revisa tu correo para confirmarla."
    )
  }

  /*
   * Cerrar sesión reemplaza la pantalla actual.
   *
   * No agrega otra página al historial.
   */
  const logout = async () => {
    if (loading) return

    setLoading(true)

    document.cookie =
      "tgc_logged_out=1; path=/; max-age=120; samesite=lax"

    await supabase.auth.signOut()

    setEmail("")
    setPassword("")
    setMessage("")

    window.location.replace("/access?step=login")
  }

  /*
   * Salimos hacia Mercado Pago usando replace.
   *
   * Así checkout no queda como una entrada adicional
   * detrás de Mercado Pago.
   */
  const pay = async () => {
    if (loading) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(
        "/api/mercadopago/create-preference",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
          }),
        }
      )

      if (response.status === 401) {
        replace("login")
        return
      }

      const data = await response.json()

      if (data?.url === "/vip") {
        window.location.replace("/vip")
        return
      }

      if (data?.url) {
        window.location.replace(data.url)
        return
      }

      setLoading(false)
      setMessage(
        data?.error ||
          "No se pudo preparar el pago. Inténtalo nuevamente."
      )
    } catch {
      setLoading(false)
      setMessage(
        "No se pudo conectar con el sistema de pagos."
      )
    }
  }

  /*
   * El paso VIP no se dibuja dentro de AccessFlow.
   * Se reemplaza por la ruta real /vip.
   */
  useEffect(() => {
    if (step === "vip") {
      window.location.replace("/vip")
    }
  }, [step])

  if (step === "vip") {
    return null
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      {(step === "pricing" || step === "checkout") && (
        <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-gold/10 bg-black/80 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="text-xs uppercase tracking-[0.35em] text-gold"
          >
            The Golden Circle
          </button>

          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="text-xs uppercase tracking-[0.25em] text-gold/80 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </header>
      )}

      {(step === "login" || step === "register") && (
        <section className="mx-auto max-w-md">
          <div className="featured-card rounded-[34px] bg-black p-8 text-center md:p-10">
            <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
              The Golden Circle
            </span>

            <h1 className="mb-4 text-5xl font-light leading-tight">
              {step === "login"
                ? "Acceso privado"
                : "Crear cuenta"}
            </h1>

            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              {step === "login"
                ? "Inicia sesión para continuar."
                : "Crea tu cuenta para acceder a la membresía."}
            </p>

            <div className="space-y-4">
              <input
                type="email"
                autoComplete="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (step === "login") {
                      login()
                    } else {
                      register()
                    }
                  }
                }}
                disabled={loading}
                className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-foreground outline-none transition focus:border-gold/50 disabled:opacity-60"
              />

              <input
                type="password"
                autoComplete={
                  step === "login"
                    ? "current-password"
                    : "new-password"
                }
                placeholder="Contraseña"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    if (step === "login") {
                      login()
                    } else {
                      register()
                    }
                  }
                }}
                disabled={loading}
                className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-foreground outline-none transition focus:border-gold/50 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={
                  step === "login"
                    ? login
                    : register
                }
                disabled={loading}
                className="telegram-button w-full rounded-xl px-6 py-4 disabled:pointer-events-none disabled:opacity-70"
              >
                {loading
                  ? "Procesando..."
                  : step === "login"
                    ? "Iniciar sesión"
                    : "Crear cuenta"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMessage("")

                  replace(
                    step === "login"
                      ? "register"
                      : "login"
                  )
                }}
                className="text-sm text-gold/70 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
              >
                {step === "login"
                  ? "¿No tienes cuenta? Regístrate"
                  : "Ya tengo cuenta"}
              </button>

              <p className="min-h-5 text-sm text-muted-foreground">
                {message}
              </p>
            </div>
          </div>
        </section>
      )}

      {step === "pricing" && (
        <section className="mx-auto max-w-6xl text-center">
          <span className="pricing-label mb-5 block">
            Membresía privada
          </span>

          <h1 className="checkout-premium-title text-5xl font-light md:text-7xl">
            Elige tu acceso
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
            Selecciona una membresía para continuar con el
            acceso privado.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                replace("checkout", "monthly")
              }
              disabled={loading}
              className="checkout-premium-card rounded-[34px] bg-black p-8 text-left transition hover:-translate-y-1 disabled:pointer-events-none disabled:opacity-60"
            >
              <p className="pricing-label mb-4 block">
                Mensual
              </p>

              <h2 className="text-4xl font-light">
                Mensual
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante un mes.
              </p>

              <p className="mt-8 text-5xl font-light text-gold">
                S/ 30
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                replace("checkout", "quarterly")
              }
              disabled={loading}
              className="checkout-premium-card rounded-[34px] bg-black p-8 text-left transition hover:-translate-y-1 disabled:pointer-events-none disabled:opacity-60"
            >
              <p className="pricing-label mb-4 block">
                Trimestral
              </p>

              <h2 className="text-4xl font-light">
                Trimestral
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Acceso privado durante tres meses.
              </p>

              <p className="mt-8 text-5xl font-light text-gold">
                S/ 90
              </p>
            </button>
          </div>

          {message && (
            <p className="mt-8 text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </section>
      )}

      {step === "checkout" && (
        <section className="mx-auto flex min-h-[calc(100dvh-96px)] max-w-5xl items-center">
          <div className="w-full">
            <div className="mb-8 text-center">
              <span className="pricing-label mb-3 block">
                Checkout
              </span>

              <h1 className="checkout-premium-title text-4xl font-light leading-none md:text-6xl">
                CONFIRMAR COMPRA
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                Revisa tu membresía antes de continuar.
              </p>
            </div>

            <div className="checkout-premium-card rounded-[34px] bg-black p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                <div className="space-y-5">
                  <div>
                    <p className="checkout-premium-label text-xs uppercase tracking-widest">
                      Membresía
                    </p>

                    <h2 className="mt-3 text-3xl font-light">
                      {prices[plan].label}
                    </h2>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan === "monthly"
                        ? "Acceso privado durante 1 mes."
                        : "Acceso privado durante 3 meses."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gold/15 bg-black/40 p-5">
                    <p className="checkout-premium-label text-xs uppercase tracking-widest">
                      Acceso
                    </p>

                    <p className="mt-3 text-2xl text-gold">
                      Miembros activos
                    </p>

                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Acceso privado y futuras actualizaciones
                      exclusivas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => replace("pricing")}
                    disabled={loading}
                    className="text-sm text-gold/70 transition hover:text-gold disabled:pointer-events-none disabled:opacity-50"
                  >
                    Cambiar membresía
                  </button>
                </div>

                <aside className="rounded-2xl border border-gold/15 bg-black/40 p-6">
                  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold/70">
                    Total
                  </p>

                  <div className="checkout-premium-price mb-6 text-5xl font-light">
                    {prices[plan].price}
                  </div>

                  <button
                    type="button"
                    onClick={pay}
                    disabled={loading}
                    className="telegram-button subscription-premium-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-xs uppercase tracking-[0.25em] transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-75"
                  >
                    {loading
                      ? "Preparando pago..."
                      : "Activar acceso"}
                  </button>

                  <p className="mt-5 text-xs leading-6 text-muted-foreground">
                    Serás redirigido a Mercado Pago para
                    completar la operación.
                  </p>

                  {message && (
                    <p className="mt-4 text-xs leading-6 text-red-300">
                      {message}
                    </p>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}