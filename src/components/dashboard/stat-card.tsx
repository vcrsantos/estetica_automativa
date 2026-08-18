import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  titulo,
  valor,
  variacao,
  comparativoLabel,
  tom,
  icon: Icon,
  href,
  hrefLabel = "Ver detalhes",
}: {
  titulo: string;
  valor: string;
  /** Percentual de variação vs. período anterior; omitido = sem indicador. */
  variacao?: number | null;
  /** Legenda ao lado do indicador de variação, ex.: "vs ontem". */
  comparativoLabel?: string;
  /** Colore o valor direto (sem seta de tendência) — use quando não há período anterior para comparar. */
  tom?: "positivo" | "negativo";
  icon?: ComponentType<{ className?: string }>;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-4.5" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">{titulo}</p>
        </div>

        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-heading text-2xl font-bold tabular-nums",
              tom === "positivo" && "text-green-600 dark:text-green-400",
              tom === "negativo" && "text-red-600 dark:text-red-400"
            )}
          >
            {valor}
          </span>
          {variacao != null && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  variacao >= 0
                    ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                )}
              >
                {variacao >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {Math.abs(variacao).toFixed(0)}%
              </span>
              {comparativoLabel && (
                <span className="text-xs text-muted-foreground">{comparativoLabel}</span>
              )}
            </div>
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
