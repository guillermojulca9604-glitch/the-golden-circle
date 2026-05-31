"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export function UploadProofForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const plan = searchParams.get("plan") ?? "monthly"
  const country = searchParams.get("country") ?? "pe"

  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const sendProof = async () => {
    if (!file) {
      setMessage("Selecciona una imagen del comprobante.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("El archivo es muy pesado. Máximo 5 MB.")
      return
    }

    try {
      setLoading(true)
      setMessage("Subiendo comprobante...")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("plan", plan)
      formData.append("country", country)

      const response = await fetch("/api/upload-proof", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error ?? "No se pudo enviar el comprobante.")
        return
      }

      setMessage("Comprobante enviado. Pasando a verificación...")
      setFile(null)

      router.refresh()
    } catch {
      setMessage("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        disabled={loading}
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null)
          setMessage("")
        }}
        className="w-full rounded-xl border border-gold/20 bg-black px-4 py-4 text-sm text-muted-foreground disabled:opacity-50"
      />

      <button
        type="button"
        onClick={sendProof}
        disabled={loading}
        className="telegram-button subscription-premium-button w-full rounded-2xl px-6 py-4 text-xs uppercase tracking-widest disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? "Subiendo comprobante..." : "Enviar comprobante"}
      </button>

      {loading && (
        <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-gold/10">
          <div className="proof-loading-bar h-full w-1/2 rounded-full bg-gold" />
        </div>
      )}

      <p className="min-h-5 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}