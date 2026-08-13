import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  titulo,
  valor,
  variacao,
  tom,
  href,
  hrefLabel = "Ver detalhes",
}: {
  titulo: string;
  valor: string;
  /** Percentual de variação vs. período anterior; omitido = sem indicador. */
  variacao?: number | null;
  /** Colore o valor direto (sem seta de tendência) — use quando não há período anterior para comparar. */
  tom?: "positivo" | "negativo";
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>

        <div className="flex items-center gap-2">
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
