import type { ComponentType } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, FileClock, Truck, Users, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardResumo } from "@/types/database";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Cor = "violeta" | "azul" | "ambar" | "esmeralda" | "preto";

const CORES: Record<Cor, { bg: string; icon: string; valor: string }> = {
  violeta: {
    bg: "bg-violet-500/15",
    icon: "text-violet-600 dark:text-violet-400",
    valor: "text-violet-700 dark:text-violet-300",
  },
  azul: {
    bg: "bg-sky-500/15",
    icon: "text-sky-600 dark:text-sky-400",
    valor: "text-sky-700 dark:text-sky-300",
  },
  ambar: {
    bg: "bg-amber-500/15",
    icon: "text-amber-600 dark:text-amber-400",
    valor: "text-amber-700 dark:text-amber-300",
  },
  esmeralda: {
    bg: "bg-emerald-500/15",
    icon: "text-emerald-600 dark:text-emerald-400",
    valor: "text-emerald-700 dark:text-emerald-300",
  },
  preto: {
    bg: "bg-foreground/10",
    icon: "text-foreground",
    valor: "text-foreground",
  },
};

function ItemOperacional({
  icon: Icon,
  titulo,
  valor,
  texto,
  href,
  cor,
  /** OS atrasadas > 0 precisa saltar aos olhos, diferente dos demais itens (que só ganham a cor da marca). */
  alerta,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  valor: number;
  texto: string;
  href: string;
  cor: Cor;
  alerta?: boolean;
}) {
  const emAlerta = valor > 0 && alerta;
  const paleta = CORES[cor];

  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-[170px] flex-1 items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent",
        emAlerta && "bg-destructive/10 hover:bg-destructive/15"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          emAlerta ? "bg-destructive/15" : paleta.bg
        )}
      >
        <Icon className={cn("size-4", emAlerta ? "text-destructive" : paleta.icon)} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            emAlerta ? "text-destructive" : paleta.valor
          )}
        >
          {texto}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">{titulo}</span>
      </div>
    </Link>
  );
}

/**
 * Faixa operacional (seção 3.2/2.4 do escopo de melhorias do dashboard) —
 * consolida indicadores de "agora" que antes ocupavam cartões cheios
 * mostrando zero na maior parte do tempo. Fica cinza/discreto quando
 * zerado, ganha cor própria por indicador quando há algo pra ver.
 */
export function FaixaOperacional({ resumo }: { resumo: DashboardResumo }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Operação agora
        </p>
        <Link
          href="/fila-do-dia"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todas
          <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-1">
      <ItemOperacional
        icon={Wrench}
        titulo="Em execução agora"
        valor={resumo.em_execucao}
        texto={String(resumo.em_execucao)}
        href="/fila-do-dia"
        cor="violeta"
      />
      <ItemOperacional
        icon={Truck}
        titulo="Previsão de entrega hoje"
        valor={resumo.previstos_hoje}
        texto={String(resumo.previstos_hoje)}
        href="/fila-do-dia"
        cor="azul"
      />
      <ItemOperacional
        icon={AlertTriangle}
        titulo="OS atrasadas"
        valor={resumo.os_atrasadas}
        texto={String(resumo.os_atrasadas)}
        href="/fila-do-dia"
        cor="preto"
        alerta
      />
      <ItemOperacional
        icon={FileClock}
        titulo="Orçamentos aguardando resposta"
        valor={resumo.orcamentos_aguardando}
        texto={String(resumo.orcamentos_aguardando)}
        href="/orcamentos"
        cor="ambar"
      />
      <ItemOperacional
        icon={Users}
        titulo="Clientes inativos (15+ dias)"
        valor={resumo.clientes_inativos}
        texto={String(resumo.clientes_inativos)}
        href="/reativacao"
        cor="preto"
      />
      <ItemOperacional
        icon={CreditCard}
        titulo="Contas a receber"
        valor={resumo.contas_a_receber}
        texto={formatarMoeda(resumo.contas_a_receber)}
        href="/contas-a-receber"
        cor="esmeralda"
      />
      </div>
    </div>
  );
}
