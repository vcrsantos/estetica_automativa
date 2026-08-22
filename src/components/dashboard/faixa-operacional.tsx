import type { ComponentType } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, FileClock, Truck, Users, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardResumo } from "@/types/database";
import { Card } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ItemOperacional({
  icon: Icon,
  titulo,
  valor,
  texto,
  href,
  /** OS atrasadas > 0 é a única exceção à regra de estado: precisa saltar aos olhos porque exige ação imediata. */
  alerta,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  valor: number;
  texto: string;
  href: string;
  alerta?: boolean;
}) {
  const emAlerta = valor > 0 && alerta;
  const ativo = valor > 0;

  return (
    <Link
      href={href}
      tabIndex={0}
      className={cn(
        "flex flex-1 items-center gap-2.5 border-r border-border px-4 py-3.5 transition-colors last:border-r-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-[#ffc400] focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none",
        emAlerta && "bg-destructive/10 hover:bg-destructive/15"
      )}
    >
      <div
        className={cn(
          "flex size-[30px] shrink-0 items-center justify-center rounded-lg",
          emAlerta ? "bg-destructive/15" : ativo ? "bg-[var(--chart-1)]/20" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "size-[15px]",
            emAlerta
              ? "text-destructive"
              : ativo
                ? "text-[#8a6a00] dark:text-[#ffd600]"
                : "text-muted-foreground"
          )}
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            "text-base leading-tight font-bold tabular-nums",
            emAlerta ? "text-destructive" : ativo ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {texto}
        </span>
        <span className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{titulo}</span>
      </div>
    </Link>
  );
}

/**
 * Faixa operacional (seção 4.4 das melhorias) — a cor codifica **estado**,
 * não categoria: zerado fica cinza/apagado, valor > 0 ganha destaque
 * amarelo (a mesma cor de acento do resto do dashboard, em vez de cinco
 * matizes competindo entre si), e só OS atrasadas vira vermelho — é a
 * única situação que exige ação imediata. Tira contínua dividida por
 * bordas verticais, sem pílulas individuais.
 */
export function FaixaOperacional({ resumo }: { resumo: DashboardResumo }) {
  return (
    <Card className="flex flex-row flex-wrap overflow-hidden p-0 shadow-none">
      <ItemOperacional
        icon={Wrench}
        titulo="Em execução"
        valor={resumo.em_execucao}
        texto={String(resumo.em_execucao)}
        href="/fila-do-dia"
      />
      <ItemOperacional
        icon={Truck}
        titulo="Previsão de entrega hoje"
        valor={resumo.previstos_hoje}
        texto={String(resumo.previstos_hoje)}
        href="/fila-do-dia"
      />
      <ItemOperacional
        icon={AlertTriangle}
        titulo="OS atrasadas"
        valor={resumo.os_atrasadas}
        texto={String(resumo.os_atrasadas)}
        href="/fila-do-dia"
        alerta
      />
      <ItemOperacional
        icon={FileClock}
        titulo="Orçamentos aguardando"
        valor={resumo.orcamentos_aguardando}
        texto={String(resumo.orcamentos_aguardando)}
        href="/orcamentos"
      />
      <ItemOperacional
        icon={Users}
        titulo="Clientes inativos (15+ dias)"
        valor={resumo.clientes_inativos}
        texto={String(resumo.clientes_inativos)}
        href="/reativacao"
      />
      <ItemOperacional
        icon={CreditCard}
        titulo="Contas a receber"
        valor={resumo.contas_a_receber}
        texto={formatarMoeda(resumo.contas_a_receber)}
        href="/contas-a-receber"
      />
    </Card>
  );
}
