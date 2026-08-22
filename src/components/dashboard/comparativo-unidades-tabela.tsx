import { Info } from "lucide-react";

import type { DashboardInsights } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Unidades (seção 4.7 das melhorias) — uma barra horizontal proporcional ao
 * faturamento por unidade, em vez de uma tabela de números lado a lado que
 * não comunica proporção nenhuma. Unidade sem faturamento no período ganha
 * uma frase de estado explícita em vez de uma barra de largura zero, que
 * não distingue "unidade fechada" de "lançamento não feito".
 */
export function ComparativoUnidadesTabela({
  titulo,
  unidades,
}: {
  titulo: string;
  unidades: DashboardInsights["comparativo_unidades"];
}) {
  const maiorFaturamento = Math.max(0, ...unidades.map((u) => u.faturamento));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {unidades.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {unidades.map((u) => {
              const percentual = maiorFaturamento > 0 ? (u.faturamento / maiorFaturamento) * 100 : 0;
              const ticketMedio = u.qtd_servicos > 0 ? u.faturamento / u.qtd_servicos : 0;
              const semFaturamento = u.faturamento <= 0;

              return (
                <div key={u.unidade_nome} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{u.unidade_nome}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatarMoeda(u.faturamento)}
                    </span>
                  </div>

                  {semFaturamento ? (
                    <div className="flex h-[26px] items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-muted-foreground">
                      <Info className="size-3.5 shrink-0" />
                      Nenhum atendimento lançado no período
                    </div>
                  ) : (
                    <div className="h-[9px] w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[color:var(--chart-1)] transition-[width] duration-350 ease-out"
                        style={{ width: `${Math.max(percentual, 1.5)}%` }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground tabular-nums">
                    {semFaturamento
                      ? "0 veículos · sem ticket médio"
                      : `${u.qtd_servicos} veículo${u.qtd_servicos === 1 ? "" : "s"} · ticket ${formatarMoeda(
                          ticketMedio
                        )} · ${percentual.toFixed(0)}% do faturamento líder`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
