"use client"

import { useEffect, useState } from "react"

export function EntryGate() {
  const [showGate, setShowGate] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("golden-circle-terms-accepted")

    if (!accepted) {
      setShowGate(true)
    }
  }, [])

  const acceptTerms = () => {
    localStorage.setItem("golden-circle-terms-accepted", "true")
    setShowGate(false)
  }

  if (!showGate) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm">
      <div className="featured-card max-w-xl rounded-3xl bg-black p-8 text-center">
        <span className="mb-4 block text-xs uppercase tracking-[0.4em] text-gold">
          Aviso
        </span>

        <h2 className="mb-6 text-4xl font-light text-foreground">
          The Golden Circle
        </h2>

        <p className="mb-6 leading-relaxed text-muted-foreground">
          Para continuar, confirma que aceptas los términos y condiciones de la
          plataforma.
        </p>

        <div className="mb-8 text-sm text-muted-foreground">
          Al ingresar aceptas el uso responsable del sitio, sus condiciones de
          acceso y las políticas aplicables.
        </div>

        <button
          type="button"
          onClick={acceptTerms}
          className="telegram-button rounded-xl px-8 py-4"
        >
          Acepto y continuar
        </button>
      </div>
    </div>
  )
}