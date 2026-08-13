import { TrendingDown, TrendingUp } from "lucide-react";

import type { DashboardPeriodo } from "@/types/database";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}: {
  titulo: string;
  atual: DashboardPeriodo;
  anterior: DashboardPeriodo;
}) {
  const variacao = variacaoPercentual(atual.faturamento, anterior.faturamento);
  const ticketMedio = atual.qtd_servicos > 0 ? atual.faturamento / atual.qtd_servicos : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-bold tabular-nums">
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
        <p className="text-xs text-muted-foreground">
          {atual.qtd_servicos} serviço{atual.qtd_servicos === 1 ? "" : "s"} · ticket médio{" "}
          {formatarMoeda(ticketMedio)}
        </p>
      </CardContent>
    </Card>
  );
}
