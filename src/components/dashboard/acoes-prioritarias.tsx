"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Insight, Severidade } from "@/lib/dashboard-insights-texto";

const ESTILO: Record<Severidade, { icon: typeof Info; bg: string; icon_: string }> = {
  critico: { icon: AlertTriangle, bg: "bg-destructive/16", icon_: "text-destructive" },
  atencao: { icon: TriangleAlert, bg: "bg-[var(--chart-1)]/16", icon_: "text-[#8a6a00] dark:text-[#ffd600]" },
  info: { icon: Info, bg: "bg-sky-500/16", icon_: "text-sky-700 dark:text-sky-400" },
};

function CartaoInsight({ insight }: { insight: Insight }) {
  const { icon: Icon, bg, icon_ } = ESTILO[insight.severidade];

  const conteudo = (
    <>
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", bg)}>
        <Icon className={cn("size-4", icon_)} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{insight.titulo}</p>
        <p className="text-xs text-muted-foreground">{insight.descricao}</p>
        {insight.cta && (
          <span className="group mt-1 flex items-center gap-1 text-xs font-medium text-[color:var(--chart-1)]">
            {insight.cta.label}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </>
  );

  const className =
    "flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-[#ffc400] focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

  if (insight.cta) {
    return (
      <Link href={insight.cta.href} className={cn(className, "group")}>
        {conteudo}
      </Link>
    );
  }

  return (
    <div tabIndex={0} className={className}>
      {conteudo}
    </div>
  );
}

/**
 * Bloco "Precisa de você" (seção 4.3 das melhorias) — substitui o ticker
 * horizontal de insights. Mostra no máximo 3 cards fixos, priorizados por
 * severidade, cada um levando a uma tela real. O resto fica atrás de "Ver
 * todas" em vez de forçar tudo na tela de uma vez.
 */
export function AcoesPrioritarias({ insights }: { insights: Insight[] }) {
  const [expandido, setExpandido] = React.useState(false);
  const visiveis = expandido ? insights : insights.slice(0, 3);
  const restantes = insights.length - 3;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
          Precisa de você
        </h2>
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {expandido ? "Ver menos" : `Ver todas (${insights.length})`}
          </button>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/16">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Nada pendente</p>
            <p className="text-xs text-muted-foreground">
              Nenhuma OS atrasada, orçamento parado ou conta vencida no momento.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((insight) => (
            <CartaoInsight key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
