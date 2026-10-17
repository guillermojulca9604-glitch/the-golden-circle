
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

type GateStatus = "checking" | "question" | "denied" | "accepted"

const CONSENT_KEY = "golden-circle-entry-accepted-v2"

const modalFont = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontVariantNumeric: "lining-nums" as const,
}

export function EntryGate() {
  const [status, setStatus] = useState<GateStatus>("checking")
  const [termsOpen, setTermsOpen] = useState(false)
  const [gateReady, setGateReady] = useState(false)

  const gateRef = useRef<HTMLDialogElement>(null)
  const termsRef = useRef<HTMLDialogElement>(null)
  const termsTitleRef = useRef<HTMLHeadingElement>(null)

  /*
   * Comprobar la aceptación guardada.
   */
  useEffect(() => {
    try {
      setStatus(
        localStorage.getItem(CONSENT_KEY) === "true"
          ? "accepted"
          : "question"
      )
    } catch {
      setStatus("question")
    }
  }, [])

  /*
   * Bloquear el desplazamiento del fondo
   * mientras el aviso esté activo.
   */
  useLayoutEffect(() => {
    if (status !== "question" && status !== "denied") {
      return
    }

    const body = document.body
    const html = document.documentElement

    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = html.style.overflow

    body.style.overflow = "hidden"
    html.style.overflow = "hidden"

    return () => {
      body.style.overflow = previousBodyOverflow
      html.style.overflow = previousHtmlOverflow
    }
  }, [status])

  /*
   * Abrir el aviso antes de pintar
   * el siguiente fotograma.
   */
  useLayoutEffect(() => {
    const gate = gateRef.current

    if (
      gate &&
      (status === "question" || status === "denied") &&
      !gate.open
    ) {
      gate.showModal()
    }

    if (gate?.open && !gateReady) {
      setGateReady(true)
    }
  }, [status, gateReady])

  /*
   * Abrir los términos por encima
   * del aviso principal.
   */
  useEffect(() => {
    const terms = termsRef.current

    if (termsOpen && terms && !terms.open) {
      terms.showModal()
      termsTitleRef.current?.focus({ preventScroll: true })
    }
  }, [termsOpen])

  const acceptTerms = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "true")
      localStorage.setItem("golden-circle-terms-accepted", "true")
    } catch {
      // Permite continuar esta visita aunque no se pueda almacenar.
    }

    gateRef.current?.close()
    setStatus("accepted")
  }

  const closeTerms = () => {
    termsRef.current?.close()
    setTermsOpen(false)
  }

  if (status === "accepted") {
    return null
  }

  return (
    <>
      {/*
       * CAPA DE PROTECCIÓN INICIAL
       *
       * Se renderiza antes de comprobar
       * localStorage, evitando mostrar
       * la página durante esa espera.
       *
       * Desaparece cuando el aviso
       * ya está abierto.
       */}
      {!gateReady && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[9999] bg-[#070503]"
          style={{
            width: "100vw",
            height: "100dvh",
            touchAction: "none",
          }}
        />
      )}

      {/* AVISO DE ACCESO */}
      <dialog
        ref={gateRef}
        aria-labelledby="entry-gate-title"
        aria-describedby="entry-gate-description"
        onCancel={(event) => event.preventDefault()}
        className="fixed inset-0 m-auto max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[590px] overflow-y-auto rounded-[22px] border border-[#b98533] bg-[#070503] p-0 text-[#f2e7d2] shadow-[0_0_28px_rgba(190,135,33,0.16)] backdrop:bg-black/75 backdrop:backdrop-blur-[8px]"
        style={modalFont}
      >
        <div
          className="relative px-6 py-8 text-center sm:px-10 sm:py-9"
          style={{
            background:
              "linear-gradient(180deg, rgba(9,7,5,0.98) 0%, rgba(7,5,3,0.985) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-24 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(245,195,105,0.95) 50%, transparent 100%)",
            }}
          />

          <div
            className="pointer-events-none absolute inset-x-24 bottom-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(232,165,63,0.82) 50%, transparent 100%)",
            }}
          />

          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#a9792b]/65 sm:w-14" />

            <span className="text-[10px] uppercase tracking-[0.35em] text-[#d3a055] sm:text-[11px]">
              Aviso de acceso
            </span>

            <span className="h-px w-10 bg-[#a9792b]/65 sm:w-14" />
          </div>

          <h2
            id="entry-gate-title"
            className="mb-3 text-[36px] leading-[1.12] font-normal text-[#ecd19a] sm:text-[44px]"
          >
            The Golden Circle
          </h2>

          {status === "denied" ? (
            <div className="mx-auto max-w-md py-4">
              <h3 className="mb-3 text-[25px] text-[#f2dfbe]">
                Acceso restringido
              </h3>

              <p
                id="entry-gate-description"
                className="text-[15px] leading-relaxed text-[#d7cab5]"
              >
                Este sitio está dirigido exclusivamente a personas mayores de
                18 años.
              </p>
            </div>
          ) : (
            <>
              <p
                id="entry-gate-description"
                className="mb-5 text-[20px] leading-tight text-[#eee3cf] sm:text-[23px]"
              >
                Sitio exclusivo para adultos.
              </p>

              <p className="mx-auto max-w-[470px] text-[14px] leading-relaxed text-[#d0c1aa] sm:text-[15px]">
                Lee y acepta los{" "}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="inline cursor-pointer border-0 bg-transparent p-0 align-baseline text-[#ddb25f] underline decoration-[#d6a750]/80 underline-offset-[4px] outline-none"
                  style={{
                    animation: "none",
                    transition: "none",
                    transform: "none",
                  }}
                >
                  términos y condiciones
                </button>{" "}
                antes de ingresar
              </p>

              <div className="mx-auto my-6 flex max-w-[260px] items-center justify-center gap-3 text-[#d8a54a]">
                <span className="h-px flex-1 bg-linear-to-r from-transparent to-[#b98735]/65" />
                <span aria-hidden="true" className="text-[20px] leading-none">
                  ✦
                </span>
                <span className="h-px flex-1 bg-linear-to-l from-transparent to-[#b98735]/65" />
              </div>

              <p className="mx-auto mb-7 max-w-[425px] text-[14px] leading-[1.65] text-[#c9bba5] sm:text-[15px]">
                Al continuar, confirmo que he leído, comprendido y aceptado
                estas condiciones.
              </p>

              <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={acceptTerms}
                  className="w-full cursor-pointer rounded-[15px] border border-[#e7b55a] px-5 py-[14px] text-[16px] font-normal text-[#251504] outline-none focus-visible:ring-2 focus-visible:ring-[#ffda87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070503] sm:text-[17px]"
                  style={{
                    background:
                      "linear-gradient(180deg, #f5d48c 0%, #e6ba67 52%, #cb8e38 100%)",
                    animation: "none",
                    transition: "none",
                    transform: "none",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,248,227,0.28)",
                  }}
                >
                  Soy mayor de 18 años
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("denied")}
                  className="w-[83%] cursor-pointer rounded-[13px] border border-[#b88431] bg-transparent px-4 py-[12px] text-[15px] text-[#efe2ce] outline-none focus-visible:ring-2 focus-visible:ring-[#dfb263] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070503] sm:text-[16px]"
                  style={{
                    animation: "none",
                    transition: "none",
                    transform: "none",
                  }}
                >
                  No soy mayor de 18 años
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>

      {/* TÉRMINOS Y CONDICIONES */}
      {termsOpen && (
        <dialog
          ref={termsRef}
          aria-labelledby="entry-terms-title"
          onCancel={(event) => {
            event.preventDefault()
            closeTerms()
          }}
          className="fixed inset-0 m-auto max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[700px] overflow-hidden rounded-[22px] border border-[#b98533] bg-[#080603] p-0 text-[#f0e4d0] shadow-[0_0_32px_rgba(190,135,33,0.15)] backdrop:bg-black/70 backdrop:backdrop-blur-[8px]"
          style={modalFont}
        >
          <div className="flex max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] min-h-0 flex-col bg-[#080603]/[0.98]">
            <header className="relative shrink-0 px-6 pt-7 pb-4 pr-16 sm:px-9 sm:pt-8 sm:pr-18">
              <h2
                ref={termsTitleRef}
                tabIndex={-1}
                id="entry-terms-title"
                className="text-[27px] font-normal leading-tight text-[#efd39f] outline-none sm:text-[33px]"
              >
                Términos y Condiciones
              </h2>

              <button
                type="button"
                onClick={closeTerms}
                aria-label="Cerrar términos y condiciones"
                className="absolute top-6 right-5 flex h-9 w-9 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#e1b25e] outline-none focus-visible:ring-2 focus-visible:ring-[#dfb263] sm:top-7 sm:right-8"
                style={{
                  animation: "none",
                  transition: "none",
                  transform: "none",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>

              <div className="mt-5 h-px bg-[#b88431]/35" />
            </header>

            {/*
             * Desplazamiento interno.
             * Barra oculta.
             * Sin transferir el scroll al fondo.
             */}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-9 [&::-webkit-scrollbar]:hidden"
              style={{
                scrollbarWidth: "none",
                overscrollBehaviorY: "contain",
              }}
            >
              <ol>
                <li className="flex gap-3 pt-5 sm:gap-4">
                  <span className="w-6 shrink-0 pt-0.5 text-[16px] text-[#e0b25d]">
                    1.
                  </span>

                  <div className="min-w-0 flex-1 border-b border-[#b88431]/25 pb-5">
                    <h3 className="mb-1 text-[20px] text-[#e0b25d]">
                      Mayoría de edad
                    </h3>

                    <p className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                      Este sitio está dirigido exclusivamente a personas mayores de 18 años. Al ingresar, declaro tener la edad requerida y acceder voluntariamente a su contenido.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3 pt-5 sm:gap-4">
                  <span className="w-6 shrink-0 pt-0.5 text-[16px] text-[#e0b25d]">
                    2.
                  </span>

                  <div className="min-w-0 flex-1 border-b border-[#b88431]/25 pb-5">
                    <h3 className="mb-1 text-[20px] text-[#e0b25d]">
                      Responsabilidad personal
                    </h3>

                    <p className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                      Reconozco la naturaleza del contenido disponible y asumo la responsabilidad de mi decisión de acceder, visualizarlo y utilizar la plataforma. Me comprometo a hacer un uso legal y responsable de sus servicios.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3 pt-5 sm:gap-4">
                  <span className="w-6 shrink-0 pt-0.5 text-[16px] text-[#e0b25d]">
                    3.
                  </span>

                  <div className="min-w-0 flex-1 border-b border-[#b88431]/25 pb-5">
                    <h3 className="mb-1 text-[20px] text-[#e0b25d]">
                      Membresía VIP
                    </h3>

                    <p className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                      La membresía VIP es personal, intransferible y tiene una vigencia determinada. Su acceso a la comunidad privada de Telegram está sujeto a las siguientes condiciones:
                    </p>

                    <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-[#d1a251]">
                      <li className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                        <strong className="text-[#efdfc6]">
                          Enlace de invitación:
                        </strong>{" "}
                        Es personal y de un solo uso. Si se comparte y otra persona intenta utilizarlo, puede quedar invalidado sin posibilidad de obtener otro durante la misma membresía.
                      </li>

                      <li className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                        <strong className="text-[#efdfc6]">
                          Salida del canal:
                        </strong>{" "}
                        Si abandono voluntariamente el canal, perderé el acceso aunque mi membresía siga activa. Para volver, deberé esperar su vencimiento y adquirir una nueva.
                      </li>

                      <li className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                        <strong className="text-[#efdfc6]">
                          Vinculación de Telegram:
                        </strong>{" "}
                        Solo se permite una cuenta de Telegram por membresía, sin posibilidad de cambiarla mientras esté activa. Tampoco podrá vincularse a otra membresía activa.
                      </li>

                      <li className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                        <strong className="text-[#efdfc6]">
                          Vencimiento:
                        </strong>{" "}
                        Al finalizar la membresía, se revocará el acceso a la comunidad privada.
                      </li>
                    </ul>
                  </div>
                </li>

                <li className="flex gap-3 pt-5 sm:gap-4">
                  <span className="w-6 shrink-0 pt-0.5 text-[16px] text-[#e0b25d]">
                    4.
                  </span>

                  <div className="min-w-0 flex-1 pb-5">
                    <h3 className="mb-1 text-[20px] text-[#e0b25d]">
                      Envío de contenido
                    </h3>

                    <p className="text-[14px] leading-[1.7] text-[#d7c9b4] sm:text-[15px]">
                      El envío de archivos ajenos a la finalidad de la comunidad, o que contengan amenazas o violencia, dará lugar a la revocación de la membresía VIP y a la expulsión del canal privado de Telegram.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}
