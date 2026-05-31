"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

type Props = {
  url: string
}

export function ProofImagePreview({ url }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoading(true)
          setOpen(true)
        }}
        className="text-gold transition hover:underline"
      >
        Ver imagen
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-6 top-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 bg-black/80 text-xl text-gold transition hover:scale-105"
          >
            ×
          </button>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          )}

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative h-[90vh] w-[90vw]"
          >
            <Image
              src={url}
              alt="Comprobante de pago"
              fill
              sizes="90vw"
              unoptimized
              onLoad={() => setLoading(false)}
              className={`object-contain transition-opacity duration-300 ${
                loading ? "opacity-0" : "opacity-100"
              }`}
            />
          </div>
        </div>
      )}
    </>
  )
}