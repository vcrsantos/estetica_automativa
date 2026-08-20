"use client";

import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/dashboard-insights-texto";

const ESTILO: Record<Insight["tipo"], { icon: typeof Lightbulb; className: string }> = {
  positivo: { icon: TrendingUp, className: "text-green-600 dark:text-green-400" },
  atencao: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
  info: { icon: Lightbulb, className: "text-sky-600 dark:text-sky-400" },
};

/**
 * Insights do negócio como faixa de notícia — rolagem horizontal contínua,
 * pausa no hover pra dar tempo de ler. A lista é duplicada pra fechar o
 * loop sem salto visível (a segunda cópia entra assim que a primeira sai).
 */
export function InsightsFaixa({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  const itens = [...insights, ...insights];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card py-2.5">
      <div className="animate-faixa-insights flex w-max items-center gap-8 group-hover:[animation-play-state:paused]">
        {itens.map((insight, i) => {
          const { icon: Icon, className } = ESTILO[insight.tipo];
          return (
            <div key={i} className="flex shrink-0 items-center gap-2 px-2 text-sm">
              <Icon className={cn("size-4 shrink-0", className)} />
              <span className="whitespace-nowrap text-foreground/90">{insight.texto}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
