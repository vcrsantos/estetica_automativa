import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-heading text-2xl font-bold tracking-tight text-primary">
          POLIBRILHO
        </span>
        <span className="text-sm text-muted-foreground">
          Sistema de gestão interna
        </span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
