"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnidadeProvider, useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo, Unidade, Usuario } from "@/types/database";

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
  {
    tipo: "grupo",
    label: "Serviços",
    icon: ClipboardList,
    itens: [
      { href: "/fila-do-dia", label: "Fila do dia" },
      { href: "/ordens", label: "Histórico" },
    ],
  },
  {
    tipo: "grupo",
    label: "Ações",
    icon: Zap,
    itens: [
      { href: "/orcamentos", label: "Orçamentos" },
      { href: "/reativacao", label: "Reativação" },
      { href: "/recibos", label: "Recibos" },
      { href: "/prestacao-contas", label: "Prestação de contas" },
    ],
  },
  { tipo: "link", href: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
];

function leafAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function grupoAtivo(pathname: string, grupo: NavGrupo) {
  return grupo.itens.some((i) => leafAtivo(pathname, i.href));
}

// Quantidade de OS ainda não finalizadas (fila do dia) — usada pra mostrar a
// bolinha de notificação em "Serviços", como no WhatsApp.
function useOsPendentesCount() {
  const { unidadeSelecionadaId } = useUnidade();
  const [quantidade, setQuantidade] = React.useState(0);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const supabase = createClient();
      let query = supabase
        .from("ordens_servico")
        .select("id", { count: "exact", head: true })
        .in("status", ["agendado", "em_execucao"]);

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { count } = await query;
      if (!cancelado) setQuantidade(count ?? 0);
    }

    carregar();
    const intervalo = setInterval(carregar, 30_000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [unidadeSelecionadaId]);

  return quantidade;
}

// Alerta (bolinha) de clientes há mais de 15 dias sem atendimento — mesmo
// dado que já aparece no card "Clientes inativos" do dashboard.
function useClientesInativosCount() {
  const { unidadeSelecionadaId } = useUnidade();
  const [quantidade, setQuantidade] = React.useState(0);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const supabase = createClient();
      const { data } = await supabase.rpc("dashboard_resumo", {
        p_unidade_id: unidadeSelecionadaId,
      });
      if (!cancelado && data) setQuantidade((data as DashboardResumo).clientes_inativos ?? 0);
    }

    carregar();
    const intervalo = setInterval(carregar, 60_000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [unidadeSelecionadaId]);

  return quantidade;
}

function NavBadge({ quantidade }: { quantidade: number }) {
  if (quantidade <= 0) return null;
  return (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[image:var(--gradient-cta)] px-1 text-[10px] leading-none font-semibold text-[#101314]">
      {quantidade > 9 ? "9+" : quantidade}
    </span>
  );
}

function NavDot({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;
  return <span className="size-2 rounded-full bg-[image:var(--gradient-cta)]" />;
}

function NavList({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const pendentes = useOsPendentesCount();
  const clientesInativos = useClientesInativosCount();
  const [gruposAlternadosManual, setGruposAlternadosManual] = React.useState<Set<string>>(
    () => new Set()
  );

  function estaAberto(grupo: NavGrupo) {
    // Abre por padrão quando contém a rota atual; alternar manualmente inverte esse padrão.
    return grupoAtivo(pathname, grupo) !== gruposAlternadosManual.has(grupo.label);
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
          const ativo = grupoAtivo(pathname, item);

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => alternarGrupo(item.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4.5", ativo && "text-primary")} />
                {item.label}
                {item.label === "Serviços" && <NavBadge quantidade={pendentes} />}
                {item.label === "Ações" && <NavDot ativo={clientesInativos > 0} />}
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
                        leafAtivo(pathname, sub.href)
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

        const active = leafAtivo(pathname, item.href);

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

function NotificacoesMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Notificações" />}>
        <Bell className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <p className="px-1.5 py-3 text-center text-sm text-muted-foreground">
          Nenhuma notificação por enquanto.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UsuarioMenu({
  usuario,
  isAdmin,
  variant = "sidebar",
}: {
  usuario: Usuario;
  isAdmin: boolean;
  variant?: "sidebar" | "compact";
}) {
  const router = useRouter();
  const [saindo, setSaindo] = React.useState(false);

  async function handleSignOut() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const iniciais = usuario.nome
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Menu do usuário"
              className="flex min-w-14 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium text-muted-foreground transition-colors data-popup-open:bg-[#FFF4CC] data-popup-open:text-[#7A5C00] dark:data-popup-open:bg-[#FFD400]/14 dark:data-popup-open:text-[#FFD400]"
            />
          }
        >
          <Avatar size="sm" className="size-5">
            <AvatarFallback className="bg-foreground/[0.06] text-[10px] font-medium text-foreground/70 ring-1 ring-foreground/15 dark:bg-foreground/[0.12] dark:ring-foreground/25">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          Você
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-48 bg-popover/90"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{usuario.nome}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem render={<Link href="/financeiro" />}>
                <Wallet className="size-4" />
                Financeiro
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled={saindo} onClick={handleSignOut} variant="destructive">
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl py-1.5 pr-2.5 pl-1 transition-colors hover:bg-accent"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
            {iniciais}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
          <span className="truncate text-xs font-semibold uppercase">{usuario.nome.split(" ")[0]}</span>
          <span className="text-[11px] text-muted-foreground">
            {isAdmin ? "Administrador" : "Atendente"}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{usuario.nome}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={saindo} onClick={handleSignOut} variant="destructive">
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileBottomNavIcon({ Icon, badge }: { Icon: Icone; badge?: number | boolean }) {
  if (!badge) return <Icon className="size-5" />;
  return (
    <span className="relative">
      <Icon className="size-5" />
      {typeof badge === "number" ? (
        <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[image:var(--gradient-cta)] px-0.5 text-[9px] leading-none font-bold text-[#101314] ring-2 ring-popover">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : (
        <span className="absolute top-0 right-0 size-2 rounded-full bg-[image:var(--gradient-cta)] ring-2 ring-popover" />
      )}
    </span>
  );
}

function MobileBottomNavItem({
  item,
  pathname,
  badge,
}: {
  item: NavEntrada;
  pathname: string;
  badge?: number | boolean;
}) {
  const Icon = item.icon;

  if (item.tipo === "grupo") {
    const ativo = grupoAtivo(pathname, item);

    return (
      <DropdownMenu key={item.label}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex min-w-14 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-colors data-popup-open:bg-[#FFF4CC] data-popup-open:text-[#7A5C00] dark:data-popup-open:bg-[#FFD400]/14 dark:data-popup-open:text-[#FFD400]",
                ativo && "bg-[#FFF4CC] text-[#7A5C00] dark:bg-[#FFD400]/14 dark:text-[#FFD400]",
                !ativo && "text-muted-foreground"
              )}
            />
          }
        >
          <MobileBottomNavIcon Icon={Icon} badge={badge} />
          {item.label}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-44 bg-popover/90">
          {item.itens.map((sub) => (
            <DropdownMenuItem
              key={sub.href}
              render={<Link href={sub.href} />}
              className={leafAtivo(pathname, sub.href) ? "font-medium text-primary" : undefined}
            >
              {sub.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const ativo = leafAtivo(pathname, item.href);

  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "flex min-w-14 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-colors",
        ativo
          ? "bg-[#FFF4CC] text-[#7A5C00] dark:bg-[#FFD400]/14 dark:text-[#FFD400]"
          : "text-muted-foreground"
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}

function MobileBottomNav({ isAdmin, usuario }: { isAdmin: boolean; usuario: Usuario }) {
  const pathname = usePathname();
  const pendentes = useOsPendentesCount();
  const clientesInativos = useClientesInativosCount();
  // Financeiro fica dentro do menu "Você" no mobile (junto com Sair) em vez de
  // ocupar um slot na cápsula; por isso itens adminOnly não entram aqui.
  const itensVisiveis = NAV_ITEMS.filter((item) => item.tipo !== "link" || !item.adminOnly);
  const meio = Math.ceil(itensVisiveis.length / 2);
  const primeiraMetade = itensVisiveis.slice(0, meio);
  const segundaMetade = itensVisiveis.slice(meio);

  function badgeDoItem(item: NavEntrada): number | boolean | undefined {
    if (item.label === "Serviços") return pendentes;
    if (item.label === "Ações") return clientesInativos > 0;
    return undefined;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.875rem)] lg:hidden"
      aria-label="Navegação principal"
    >
      <div className="flex items-center gap-1 rounded-full border border-border bg-popover/90 p-2 shadow-sm">
        {primeiraMetade.map((item) => (
          <MobileBottomNavItem
            key={item.tipo === "grupo" ? item.label : item.href}
            item={item}
            pathname={pathname}
            badge={badgeDoItem(item)}
          />
        ))}

        <Link
          href="/ordens/novo"
          aria-label="Nova ordem de serviço"
          className="flex size-14 shrink-0 -translate-y-4 items-center justify-center rounded-full bg-[image:var(--gradient-cta)] text-[#101314] shadow-[0_0_0_6px_var(--background)] transition-transform active:scale-95"
        >
          <Plus className="size-6" />
        </Link>

        {segundaMetade.map((item) => (
          <MobileBottomNavItem
            key={item.tipo === "grupo" ? item.label : item.href}
            item={item}
            pathname={pathname}
            badge={badgeDoItem(item)}
          />
        ))}

        <UsuarioMenu usuario={usuario} isAdmin={isAdmin} variant="compact" />
      </div>
    </nav>
  );
}

function LogoPolibrilho() {
  return (
    <div className="flex items-center justify-center border-b border-border px-4 py-2 sm:px-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo estático em public/, sem necessidade do pipeline de otimização de imagem */}
      <img src="/logo-polibrilho.png" alt="POLIBRILHO Estética Automotiva" className="h-40 w-auto" />
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

  return (
    <UnidadeProvider unidades={unidades} unidadeFixaId={unidadeFixaId}>
      <div className="h-screen bg-background">
        <div className="flex h-screen w-full overflow-hidden bg-card">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
            <LogoPolibrilho />
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NavList isAdmin={isAdmin} />
            </div>
            <div className="border-t border-border px-3 py-3">
              <UsuarioMenu usuario={usuario} isAdmin={isAdmin} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo estático em public/, sem necessidade do pipeline de otimização de imagem */}
              <img
                src="/logo-polibrilho.png"
                alt="POLIBRILHO Estética Automotiva"
                className="h-14 w-auto lg:hidden"
              />

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <NotificacoesMenu />
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <UnidadeSeletor />
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 sm:px-6 sm:pt-6 sm:pb-28 lg:pb-6">
              {children}
            </main>
          </div>

          <MobileBottomNav isAdmin={isAdmin} usuario={usuario} />
        </div>
      </div>
    </UnidadeProvider>
  );
}
