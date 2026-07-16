"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

type Step =
  | "login"
  | "register"
  | "pricing"
  | "checkout"
  | "vip"

type Plan = "monthly" | "quarterly"

type Props = {
  initialStep: string
  initialPlan: Plan
  initialEmail: string | null
}

type FlowHistoryState = {
  __tgcFlow?: true
  flowIndex?: number
  step?: Step
  plan?: Plan
  [key: string]: unknown
}

const FLOW_FROM_HOME_KEY =
  "tgc:flow-from-home"

const LOGOUT_CLEANUP_KEY =
  "tgc:logout-cleanup"

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

function isValidStep(
  value: string | null
): value is Step {
  return Boolean(
    value &&
      validSteps.includes(value as Step)
  )
}

export function AccessFlow({
  initialStep,
  initialPlan,
  initialEmail,
}: Props) {
  const supabase = createClient()

  const normalizedInitialStep: Step =
    validSteps.includes(initialStep as Step)
      ? (initialStep as Step)
      : "login"

  const [step, setStep] = useState<Step>(
    normalizedInitialStep
  )

  const [plan, setPlan] =
    useState<Plan>(initialPlan)

  const [email, setEmail] = useState(
    initialEmail || ""
  )

  const [password, setPassword] =
    useState("")

  const [message, setMessage] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  /*
   * Índice 0:
   * Login o Precios.
   *
   * Índice 1:
   * Checkout.
   *
   * Cuando agreguemos más pasos,
   * continuarán con 2, 3, etc.
   */
  const flowIndexRef = useRef(0)

  const buildUrl = useCallback(
    (
      nextStep: Step,
      nextPlan: Plan
    ) => {
      if (nextStep === "checkout") {
        return `/access?step=checkout&plan=${nextPlan}`
      }

      return `/access?step=${nextStep}`
    },
    []
  )

  const writeHistory = useCallback(
    (
      mode: "push" | "replace",
      nextStep: Step,
      nextPlan: Plan,
      nextIndex: number
    ) => {
      const currentState =
        (window.history.state ||
          {}) as FlowHistoryState

      const nextState: FlowHistoryState = {
        ...currentState,
        __tgcFlow: true,
        flowIndex: nextIndex,
        step: nextStep,
        plan: nextPlan,
      }

      const nextUrl = buildUrl(
        nextStep,
        nextPlan
      )

      if (mode === "push") {
        window.history.pushState(
          nextState,
          "",
          nextUrl
        )
      } else {
        window.history.replaceState(
          nextState,
          "",
          nextUrl
        )
      }

      flowIndexRef.current = nextIndex
    },
    [buildUrl]
  )

  /*
   * Reemplaza el paso actual.
   *
   * Lo usamos especialmente para:
   *
   * Login → Precios
   *
   * Así Login desaparece mientras
   * la sesión está iniciada.
   */
  const replaceStep = useCallback(
    (
      nextStep: Step,
      nextPlan: Plan = plan
    ) => {
      setStep(nextStep)
      setPlan(nextPlan)
      setMessage("")
      setLoading(false)

      writeHistory(
        "replace",
        nextStep,
        nextPlan,
        flowIndexRef.current
      )
    },
    [plan, writeHistory]
  )

  /*
   * Agrega un nuevo paso al historial.
   *
   * Lo usamos para:
   *
   * Precios → Checkout
   */
  const pushStep = useCallback(
    (
      nextStep: Step,
      nextPlan: Plan = plan
    ) => {
      const nextIndex =
        flowIndexRef.current + 1

      setStep(nextStep)
      setPlan(nextPlan)
      setMessage("")
      setLoading(false)

      writeHistory(
        "push",
        nextStep,
        nextPlan,
        nextIndex
      )
    },
    [plan, writeHistory]
  )

  /*
   * Marca la primera posición del flujo.
   */
  useEffect(() => {
    const currentState =
      (window.history.state ||
        {}) as FlowHistoryState

    const existingIndex =
      currentState.__tgcFlow &&
      Number.isInteger(
        currentState.flowIndex
      )
        ? Number(currentState.flowIndex)
        : 0

    flowIndexRef.current =
      existingIndex

    writeHistory(
      "replace",
      normalizedInitialStep,
      initialPlan,
      existingIndex
    )
  }, [
    initialPlan,
    normalizedInitialStep,
    writeHistory,
  ])

  /*
   * Controla las flechas Atrás y Adelante.
   */
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

      const urlPlan: Plan =
        params.get("plan") ===
        "quarterly"
          ? "quarterly"
          : "monthly"

      const historyState =
        (event.state ||
          {}) as FlowHistoryState

      if (
        historyState.__tgcFlow &&
        Number.isInteger(
          historyState.flowIndex
        )
      ) {
        flowIndexRef.current =
          Number(
            historyState.flowIndex
          )
      }

      setStep(
        isValidStep(urlStep)
          ? urlStep
          : "login"
      )

      setPlan(urlPlan)
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
   * Comprueba la sesión al cargar,
   * volver con las flechas o recuperar
   * el foco de la pestaña.
   */
  useEffect(() => {
    const checkMembership =
      async () => {
        try {
          const response =
            await fetch(
              "/api/membership-status",
              {
                cache: "no-store",
              }
            )

          if (
            response.status === 401
          ) {
            if (
              step !== "login" &&
              step !== "register"
            ) {
              replaceStep("login")
            }

            return
          }

          const data =
            await response.json()

          if (data.active) {
            window.location.replace(
              "/vip"
            )

            return
          }

          setLoading(false)
        } catch {
          setLoading(false)
        }
      }

    window.addEventListener(
      "pageshow",
      checkMembership
    )

    window.addEventListener(
      "focus",
      checkMembership
    )

    checkMembership()

    return () => {
      window.removeEventListener(
        "pageshow",
        checkMembership
      )

      window.removeEventListener(
        "focus",
        checkMembership
      )
    }
  }, [replaceStep, step])

  useEffect(() => {
    if (step === "vip") {
      window.location.replace("/vip")
    }
  }, [step])

  const login = async () => {
    if (
      !email.trim() ||
      !password
    ) {
      setMessage(
        "Completa correo y contraseña."
      )

      return
    }

    setLoading(true)
    setMessage("Procesando...")

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        }
      )

    if (error) {
      setLoading(false)

      setMessage(
        "Correo o contraseña incorrectos."
      )

      return
    }

    document.cookie =
      "tgc_logged_out=; path=/; max-age=0; samesite=lax"

    try {
      const statusResponse =
        await fetch(
          "/api/membership-status",
          {
            cache: "no-store",
          }
        )

      const statusData =
        await statusResponse.json()

      if (statusData.active) {
        window.location.replace(
          "/vip"
        )

        return
      }

      /*
       * El paso Login se reemplaza
       * por el paso Precios.
       *
       * Queda:
       *
       * Página externa
       * → Inicio
       * → Precios
       */
      replaceStep("pricing")
    } catch {
      setLoading(false)

      setMessage(
        "La sesión inició, pero no se pudo comprobar la membresía."
      )
    }
  }

  const register = async () => {
    if (
      !email.trim() ||
      !password
    ) {
      setMessage(
        "Completa correo y contraseña."
      )

      return
    }

    setLoading(true)
    setMessage("Creando cuenta...")

    const { error } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            `${window.location.origin}/access?step=pricing`,
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
   * Al cerrar sesión:
   *
   * 1. Cerramos Supabase.
   * 2. Retrocedemos hasta Inicio.
   * 3. Inicio crea nuevamente Login.
   * 4. El navegador elimina Precios
   *    y Checkout de la flecha Adelante.
   */
  const logout = async () => {
    if (loading) {
      return
    }

    setLoading(true)

    document.cookie =
      "tgc_logged_out=1; path=/; max-age=120; samesite=lax"

    await supabase.auth.signOut()

    setEmail("")
    setPassword("")
    setMessage("")

    const flowStartedFromHome =
      sessionStorage.getItem(
        FLOW_FROM_HOME_KEY
      ) === "1"

    /*
     * Cuando el usuario entró directamente
     * a Login sin pasar por Inicio, no podemos
     * asegurar que Inicio esté detrás.
     *
     * En ese caso simplemente reemplazamos
     * la pantalla por Login.
     */
    if (!flowStartedFromHome) {
      sessionStorage.removeItem(
        LOGOUT_CLEANUP_KEY
      )

      window.location.replace(
        "/access?step=login"
      )

      return
    }

    /*
     * Inicio leerá esta señal
     * cuando vuelva a aparecer.
     */
    sessionStorage.setItem(
      LOGOUT_CLEANUP_KEY,
      "1"
    )

    /*
     * Desde Precios:
     *
     * índice 0 + 1 = retroceder 1.
     *
     * Desde Checkout:
     *
     * índice 1 + 1 = retroceder 2.
     */
    const stepsBackToHome =
      Math.max(
        1,
        flowIndexRef.current + 1
      )

    window.history.go(
      -stepsBackToHome
    )
  }

  const returnToHome = () => {
    const flowStartedFromHome =
      sessionStorage.getItem(
        FLOW_FROM_HOME_KEY
      ) === "1"

    if (!flowStartedFromHome) {
      window.location.assign("/")
      return
    }

    const stepsBackToHome =
      Math.max(
        1,
        flowIndexRef.current + 1
      )

    window.history.go(
      -stepsBackToHome
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
            body: JSON.stringify({
              plan,
            }),
          }
        )

      if (
        response.status === 401
      ) {
        replaceStep("login")
        return
      }

      const data =
        await response.json()

      if (data?.url === "/vip") {
        window.location.replace(
          "/vip"
        )

        return
      }

      if (data?.url) {
        /*
         * Mercado Pago es externo.
         * Esta parte se probará después
         * de confirmar el flujo interno.
         */
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

  if (step === "vip") {
    return null
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-24 text-foreground">
      {(step === "pricing" ||
        step === "checkout") && (
        <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-gold/10 bg-black/80 px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={returnToHome}
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
                    event.key === "Enter"
                  ) {
                    if (
                      step === "login"
                    ) {
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
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    if (
                      step === "login"
                    ) {
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
            para continuar con el acceso
            privado.
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
                Acceso privado durante un
                mes.
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
                Acceso privado durante tres
                meses.
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
                Revisa tu membresía antes
                de continuar.
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