"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"
import {
  AUTH_EVENT_KEY,
  logoutToHome,
} from "@/lib/auth/logout-to-home"

type Step =
  | "login"
  | "register"
  | "pricing"
  | "checkout"
  | "vip"

type Plan =
  | "monthly"
  | "quarterly"

type Props = {
  initialStep: string
  initialPlan: Plan
  initialEmail: string | null
}

type FlowHistoryState =
  Record<string, unknown> & {
    __tgcFlow?: true
    step?: Step
    plan?: Plan
  }

const prices: Record<
  Plan,
  {
    label: string
    price: string
  }
> = {
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

function isValidStep(
  value:
    | string
    | null
    | undefined
): value is Step {
  return Boolean(
    value &&
      validSteps.includes(
        value as Step
      )
  )
}

function isPlan(
  value: unknown
): value is Plan {
  return (
    value === "monthly" ||
    value === "quarterly"
  )
}

function getHistoryState():
  FlowHistoryState {
  if (
    typeof window
      .history.state ===
      "object" &&
    window.history.state !==
      null
  ) {
    return {
      ...window.history.state,
    }
  }

  return {}
}

export function AccessFlow({
  initialStep,
  initialPlan,
  initialEmail,
}: Props) {
  const [supabase] =
    useState(
      () => createClient()
    )

  const normalizedInitialStep:
    Step =
      isValidStep(initialStep)
        ? initialStep
        : "login"

  const [step, setStep] =
    useState<Step>(
      normalizedInitialStep
    )

  const [plan, setPlan] =
    useState<Plan>(
      initialPlan
    )

  const [email, setEmail] =
    useState(
      initialEmail ?? ""
    )

  const [
    password,
    setPassword,
  ] = useState("")

  const [
    message,
    setMessage,
  ] = useState("")

  const [
    loading,
    setLoading,
  ] = useState(false)

  const buildUrl =
    useCallback(
      (
        nextStep: Step,
        nextPlan: Plan
      ) => {
        if (
          nextStep ===
          "checkout"
        ) {
          return (
            "/access?" +
            "step=checkout" +
            `&plan=${nextPlan}`
          )
        }

        return (
          `/access?step=${nextStep}`
        )
      },
      []
    )

  const writeHistory =
    useCallback(
      (
        mode:
          | "push"
          | "replace",
        nextStep: Step,
        nextPlan: Plan
      ) => {
        const nextState:
          FlowHistoryState = {
            ...getHistoryState(),
            __tgcFlow: true,
            step: nextStep,
            plan: nextPlan,
          }

        const nextUrl =
          buildUrl(
            nextStep,
            nextPlan
          )

        if (
          mode === "push"
        ) {
          window.history
            .pushState(
              nextState,
              "",
              nextUrl
            )
        } else {
          window.history
            .replaceState(
              nextState,
              "",
              nextUrl
            )
        }
      },
      [buildUrl]
    )

  /*
   * Login → Pricing utiliza replace.
   *
   * Login deja de estar en el recorrido
   * mientras la sesión continúa iniciada.
   */
  const replaceStep =
    useCallback(
      (
        nextStep: Step,
        nextPlan:
          Plan = plan
      ) => {
        setStep(nextStep)
        setPlan(nextPlan)
        setMessage("")
        setLoading(false)

        writeHistory(
          "replace",
          nextStep,
          nextPlan
        )
      },
      [
        plan,
        writeHistory,
      ]
    )

  /*
   * Pricing → Checkout utiliza push.
   *
   * Atrás y Adelante funcionan normalmente
   * durante la sesión.
   */
  const pushStep =
    useCallback(
      (
        nextStep: Step,
        nextPlan:
          Plan = plan
      ) => {
        setStep(nextStep)
        setPlan(nextPlan)
        setMessage("")
        setLoading(false)

        writeHistory(
          "push",
          nextStep,
          nextPlan
        )
      },
      [
        plan,
        writeHistory,
      ]
    )

  useEffect(() => {
    writeHistory(
      "replace",
      normalizedInitialStep,
      initialPlan
    )
  }, [
    initialPlan,
    normalizedInitialStep,
    writeHistory,
  ])

  useEffect(() => {
    const onPopState = (
      event: PopStateEvent
    ) => {
      const params =
        new URLSearchParams(
          window.location.search
        )

      const urlStep =
        params.get("step")

      const urlPlan:
        Plan =
          params.get("plan") ===
          "quarterly"
            ? "quarterly"
            : "monthly"

      const historyState:
        FlowHistoryState =
          typeof event.state ===
              "object" &&
            event.state !== null
            ? (
                event.state as
                  FlowHistoryState
              )
            : {}

      let nextStep:
        Step = "login"

      if (
        isValidStep(urlStep)
      ) {
        nextStep =
          urlStep
      } else if (
        isValidStep(
          historyState.step
        )
      ) {
        nextStep =
          historyState.step
      }

      const nextPlan =
        isPlan(
          historyState.plan
        )
          ? historyState.plan
          : urlPlan

      setStep(nextStep)
      setPlan(nextPlan)
      setMessage("")
      setLoading(false)
    }

    window.addEventListener(
      "popstate",
      onPopState
    )

    return () => {
      window.removeEventListener(
        "popstate",
        onPopState
      )
    }
  }, [])

  /*
   * Impide que una página privada restaurada
   * desde Atrás, Adelante o bfcache muestre
   * contenido después de cerrar sesión.
   */
  useEffect(() => {
    let redirecting =
      false

    const redirect = (
      url: string
    ) => {
      if (redirecting) {
        return
      }

      redirecting = true

      window.location.replace(
        url
      )
    }

    const check = async () => {
      if (redirecting) {
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
          response.status ===
          401
        ) {
          if (
            step === "pricing" ||
            step === "checkout" ||
            step === "vip"
          ) {
            redirect("/")
            return
          }

          setLoading(false)
          return
        }

        if (!response.ok) {
          setLoading(false)
          return
        }

        const data =
          await response.json()

        if (data.active) {
          redirect("/vip")
          return
        }

        setLoading(false)
      } catch {
        if (
          step === "pricing" ||
          step === "checkout" ||
          step === "vip"
        ) {
          redirect("/")
          return
        }

        setLoading(false)
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
      data: { subscription },
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
  }, [
    step,
    supabase,
  ])

  useEffect(() => {
    if (
      step === "vip"
    ) {
      window.location.replace(
        "/vip"
      )
    }
  }, [step])

  const login = async () => {
    const cleanEmail =
      email.trim()

    if (
      !cleanEmail ||
      !password
    ) {
      setMessage(
        "Completa correo y contraseña."
      )

      return
    }

    setLoading(true)
    setMessage(
      "Procesando..."
    )

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email: cleanEmail,
          password,
        })

    if (error) {
      setLoading(false)

      setMessage(
        "Correo o contraseña incorrectos."
      )

      return
    }

    document.cookie =
      "tgc_logged_out=; " +
      "path=/; " +
      "max-age=0; " +
      "samesite=lax"

    try {
      const statusResponse =
        await fetch(
          "/api/membership-status",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          }
        )

      if (
        statusResponse.status ===
        401
      ) {
        setLoading(false)

        setMessage(
          "La sesión no pudo validarse. Inténtalo nuevamente."
        )

        return
      }

      const statusData =
        await statusResponse.json()

      if (
        statusData.active
      ) {
        window.location.replace(
          "/vip"
        )

        return
      }

      replaceStep(
        "pricing"
      )
    } catch {
      setLoading(false)

      setMessage(
        "La sesión inició, pero no se pudo comprobar la membresía."
      )
    }
  }

  const register = async () => {
    const cleanEmail =
      email.trim()

    if (
      !cleanEmail ||
      !password
    ) {
      setMessage(
        "Completa correo y contraseña."
      )

      return
    }

    setLoading(true)
    setMessage(
      "Creando cuenta..."
    )

    const { error } =
      await supabase.auth
        .signUp({
          email: cleanEmail,
          password,

          options: {
            emailRedirectTo:
              `${window.location.origin}` +
              "/access?step=pricing",
          },
        })

    if (error) {
      setLoading(false)

      setMessage(
        "No se pudo crear la cuenta."
      )

      return
    }

    setLoading(false)

    setMessage(
      "Cuenta creada. Revisa tu correo para confirmarla."
    )
  }

  /*
   * Única lógica de cierre:
   *
   * Supabase → limpiar estado → Inicio.
   */
  const logout = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage("")

    await logoutToHome(
      supabase
    )
  }

  const pay = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response =
        await fetch(
          "/api/mercadopago/create-preference",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body: JSON.stringify({
              plan,
            }),
          }
        )

      if (
        response.status ===
        401
      ) {
        window.location.replace(
          "/"
        )

        return
      }

      const data =
        await response.json()

      if (
        data?.url === "/vip"
      ) {
        window.location.replace(
          "/vip"
        )

        return
      }

      if (
        typeof data?.url ===
          "string" &&
        data.url.length > 0
      ) {
        window.location.assign(
          data.url
        )

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

  if (
    step === "vip"
  ) {
    return null
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      {(step === "pricing" ||
        step === "checkout") && (
        <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-gold/10 bg-black/80 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() =>
              window.location.assign(
                "/"
              )
            }
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
            {loading
              ? "Cerrando..."
              : "Cerrar sesión"}
          </button>
        </header>
      )}

      {(step === "login" ||
        step === "register") && (
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
                  setEmail(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    if (
                      step ===
                      "login"
                    ) {
                      void login()
                    } else {
                      void register()
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
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    if (
                      step ===
                      "login"
                    ) {
                      void login()
                    } else {
                      void register()
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

                  replaceStep(
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
            Selecciona una membresía
            para continuar con el
            acceso privado.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                pushStep(
                  "checkout",
                  "monthly"
                )
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
                Acceso privado durante
                un mes.
              </p>

              <p className="mt-8 text-5xl font-light text-gold">
                S/ 30
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                pushStep(
                  "checkout",
                  "quarterly"
                )
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
                Acceso privado durante
                tres meses.
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
                Revisa tu membresía
                antes de continuar.
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
                      {
                        prices[plan]
                          .label
                      }
                    </h2>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan ===
                      "monthly"
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
                      Acceso privado y
                      futuras actualizaciones
                      exclusivas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      window.history.back()
                    }
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
                    {
                      prices[plan]
                        .price
                    }
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
                    Serás redirigido a
                    Mercado Pago para
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