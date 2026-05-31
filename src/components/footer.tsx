export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-gold/10 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/20 text-gold">
            G
          </div>

          <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            The Golden Circle
          </span>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          © 2026 The Golden Circle. Todos los derechos reservados.
        </p>

        <div className="flex gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold/20" />
        </div>
      </div>
    </footer>
  )
}