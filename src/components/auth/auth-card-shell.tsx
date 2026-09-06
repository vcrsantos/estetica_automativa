export function AuthCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático em public/, sem necessidade do pipeline de otimização de imagem */}
        <img src="/logo-polibrilho.png" alt="POLIBRILHO Estética Automotiva" className="h-28 w-auto" />
        <span className="text-sm text-muted-foreground">Sistema de gestão interna</span>
      </div>
      <div className="w-full max-w-[520px]">{children}</div>
      <p className="text-xs text-muted-foreground">© 2026 Polibrilho</p>
    </div>
  );
}
