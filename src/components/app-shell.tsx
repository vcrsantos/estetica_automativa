"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Zap,
  Wallet,
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnidadeProvider, useUnidade } from "@/components/providers/unidade-provider";
import type { Unidade, Usuario } from "@/types/database";

type Icone = React.ComponentType<{ className?: string }>;

type NavLink = { tipo: "link"; href: string; label: string; icon: Icone; adminOnly?: boolean };
type NavGrupo = { tipo: "grupo"; label: string; icon: Icone; itens: { href: string; label: string }[] };
type NavEntrada = NavLink | NavGrupo;

const NAV_ITEMS: NavEntrada[] = [
  { tipo: "link", href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    tipo: "grupo",
    label: "Cadastros",
    icon: Users,
    itens: [
      { href: "/clientes", label: "Clientes" },
      { href: "/servicos", label: "Catálogo" },
    ],
  },
  { tipo: "link", href: "/fila-do-dia", label: "Serviços", icon: ClipboardList },
  {
    tipo: "grupo",
    label: "Ações",
    icon: Zap,
    itens: [
      { href: "/orcamentos", label: "Orçamentos" },
      { href: "/reativacao", label: "Reativação" },
    ],
  },
  { tipo: "link", href: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
];

function NavList({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [gruposAlternadosManual, setGruposAlternadosManual] = React.useState<Set<string>>(
    () => new Set()
  );

  function leafAtivo(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function grupoAtivo(grupo: NavGrupo) {
    return grupo.itens.some((i) => leafAtivo(i.href));
  }

  function estaAberto(grupo: NavGrupo) {
    // Abre por padrão quando contém a rota atual; alternar manualmente inverte esse padrão.
    return grupoAtivo(grupo) !== gruposAlternadosManual.has(grupo.label);
  }

  function alternarGrupo(label: string) {
    setGruposAlternadosManual((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(label)) proximo.delete(label);
      else proximo.add(label);
      return proximo;
    });
  }

  const itensVisiveis = NAV_ITEMS.filter((item) => item.tipo !== "link" || !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pt-2 pb-1 text-xs font-medium tracking-wider text-muted-foreground/70 uppercase">
        Menu principal
      </p>

      {itensVisiveis.map((item) => {
        const Icon = item.icon;

        if (item.tipo === "grupo") {
          const aberto = estaAberto(item);

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => alternarGrupo(item.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  grupoAtivo(item)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4.5", grupoAtivo(item) && "text-primary")} />
                {item.label}
                <ChevronDown
                  className={cn("ml-auto size-3.5 transition-transform", aberto && "rotate-180")}
                />
              </button>

              {aberto && (
                <div className="mt-1 ml-5 flex flex-col gap-0.5 border-l border-border pl-4">
                  {item.itens.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onNavigate}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm transition-colors",
                        leafAtivo(sub.href)
                          ? "font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const active = leafAtivo(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4.5", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UnidadeSeletor() {
  const { unidades, unidadeSelecionadaId, setUnidadeSelecionadaId, podeAlternar } =
    useUnidade();

  if (!podeAlternar) {
    const unidade = unidades.find((u) => u.id === unidadeSelecionadaId);
    return (
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {unidade?.nome ?? "Unidade"}
      </span>
    );
  }

  return (
    <Select
      items={{ todas: "Todas as unidades", ...Object.fromEntries(unidades.map((u) => [u.id, u.nome])) }}
      value={unidadeSelecionadaId ?? "todas"}
      onValueChange={(value) => setUnidadeSelecionadaId(value === "todas" ? null : value)}
    >
      <SelectTrigger className="h-9 w-[180px]">
        <SelectValue placeholder="Todas as unidades" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as unidades</SelectItem>
        {unidades.map((unidade) => (
          <SelectItem key={unidade.id} value={unidade.id}>
            {unidade.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SairButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Sair"
    >
      <LogOut className="size-4" />
    </Button>
  );
}

function LogoPolibrilho() {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
      <span className="font-heading text-lg font-bold tracking-tight text-primary">POLIBRILHO</span>
    </div>
  );
}

export function AppShell({
  usuario,
  unidades,
  children,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  children: React.ReactNode;
}) {
  const unidadeFixaId = usuario.perfil === "administrador" ? null : usuario.unidade_id;
  const isAdmin = usuario.perfil === "administrador";
  const [menuAberto, setMenuAberto] = React.useState(false);

  return (
    <UnidadeProvider unidades={unidades} unidadeFixaId={unidadeFixaId}>
      <div className="min-h-screen bg-background p-3 sm:p-5">
        <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] overflow-hidden rounded-3xl bg-card shadow-[var(--shell-shadow)] sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[34px]">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
            <LogoPolibrilho />
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NavList isAdmin={isAdmin} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <ThemeToggle />
              <SairButton />
            </div>
          </aside>

          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <LogoPolibrilho />
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <NavList isAdmin={isAdmin} onNavigate={() => setMenuAberto(false)} />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                <ThemeToggle />
                <SairButton />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMenuAberto(true)}
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>

              <span className="font-heading text-lg font-bold tracking-tight text-primary lg:hidden">
                POLIBRILHO
              </span>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {usuario.nome} · {isAdmin ? "Administrador" : "Atendente"}
                </span>
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <UnidadeSeletor />
              </div>
            </header>

            <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      </div>
    </UnidadeProvider>
  );
}
