import { ResetPasswordForm } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-20 text-foreground">
      <div className="featured-card mx-auto max-w-md rounded-[34px] bg-black p-8 text-center md:p-10">
        <span className="mb-5 block text-xs uppercase tracking-[0.45em] text-gold">
          The Golden Circle
        </span>

        <h1 className="mb-4 text-5xl font-light leading-tight">
          Nueva contraseña
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Escribe una nueva contraseña para recuperar tu acceso.
        </p>

        <ResetPasswordForm />
      </div>
    </main>
  )
}