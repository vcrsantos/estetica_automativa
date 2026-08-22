import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatarVariacao, type Variacao } from "@/lib/dashboard-variacao";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  titulo,
  valor,
  variacao,
  formatarVariacaoValor = String,
  comparativoLabel,
  legenda,
  tom,
  icon: Icon,
  destaque,
  size = "default",
  legendaTom,
  href,
  hrefLabel = "Ver detalhes",
}: {
  titulo: string;
  valor: string;
  /** Resultado de calcularVariacao(atual, anterior); omitido = sem indicador. */
  variacao?: Variacao;
  /** Formata a diferença absoluta mostrada ao lado do percentual, ex.: moeda. */
  formatarVariacaoValor?: (v: number) => string;
  /** Legenda ao lado do indicador de variação, ex.: "vs ontem". */
  comparativoLabel?: string;
  /** Linha secundária livre, independente da variação — ex.: um valor complementar. */
  legenda?: string;
  /** Colore o valor direto (sem seta de tendência) — use quando não há período anterior para comparar. */
  tom?: "positivo" | "negativo";
  icon?: ComponentType<{ className?: string }>;
  /** Destaca o card com um acento dourado — usado nos KPIs de faturamento para diferenciar de indicadores operacionais. */
  destaque?: boolean;
  /** "hero" aumenta o valor pra dar peso visual — reservado ao KPI principal da linha (seção 4.1 das melhorias). */
  size?: "hero" | "default";
  /** Colore a pílula da legenda — use "negativo" pra chamar atenção (ex.: valor pendente vencido). */
  legendaTom?: "negativo";
  href?: string;
  hrefLabel?: string;
}) {
  const infoVariacao = variacao ? formatarVariacao(variacao, formatarVariacaoValor) : null;

  return (
    <Card className={cn(destaque && "border-[var(--chart-1)]/40 bg-[var(--chart-1)]/[0.06]")}>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                destaque
                  ? "bg-[var(--chart-1)]/20 text-[#8a6a00] dark:text-[#ffd600]"
                  : "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="size-4.5" />
            </div>
          )}
          <p className="text-sm font-medium text-foreground">{titulo}</p>
        </div>

        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-heading font-semibold tracking-tight tabular-nums",
              size === "hero" ? "text-[44px]" : "text-[27px]",
              tom === "positivo" && "text-green-600 dark:text-green-400",
              tom === "negativo" && "text-red-600 dark:text-red-400"
            )}
          >
            {valor}
          </span>
          {infoVariacao && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                  infoVariacao.tom === "positivo" &&
                    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
                  infoVariacao.tom === "negativo" &&
                    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
                  infoVariacao.tom === "neutro" && "bg-muted text-muted-foreground"
                )}
              >
                {infoVariacao.tom === "positivo" && <TrendingUp className="size-3" />}
                {infoVariacao.tom === "negativo" && <TrendingDown className="size-3" />}
                {infoVariacao.texto}
              </span>
              {!infoVariacao.indisponivel && comparativoLabel && (
                <span className="text-xs text-muted-foreground">{comparativoLabel}</span>
              )}
            </div>
          )}
          {legenda && (
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
                legendaTom === "negativo"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {legenda}
            </span>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className="mt-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {hrefLabel}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
