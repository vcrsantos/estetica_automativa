import type { ComponentType } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import type { DashboardPeriodo } from "@/types/database";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

export function PeriodoCard({
  titulo,
  atual,
  anterior,
  icon: Icon,
}: {
  titulo: string;
  atual: DashboardPeriodo;
  anterior: DashboardPeriodo;
  icon?: ComponentType<{ className?: string }>;
}) {
  const variacao = variacaoPercentual(atual.faturamento, anterior.faturamento);
  const ticketMedio = atual.qtd_servicos > 0 ? atual.faturamento / atual.qtd_servicos : 0;

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-4.5" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-lg font-bold tabular-nums">
              {formatarMoeda(atual.faturamento)}
            </span>
            {variacao !== null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  variacao >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}
              >
                {variacao >= 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {Math.abs(variacao).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {atual.qtd_servicos} serviço{atual.qtd_servicos === 1 ? "" : "s"} · ticket médio{" "}
            {formatarMoeda(ticketMedio)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
