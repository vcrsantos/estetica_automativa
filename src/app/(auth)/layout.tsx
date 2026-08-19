import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático em public/, sem necessidade do pipeline de otimização de imagem */}
        <img src="/logo-polibrilho.png" alt="POLIBRILHO Estética Automotiva" className="h-32 w-auto" />
        <span className="text-sm text-muted-foreground">
          Sistema de gestão interna
        </span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
