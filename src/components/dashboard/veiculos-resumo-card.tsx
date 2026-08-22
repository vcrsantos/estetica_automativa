"use client";

import { Car } from "lucide-react";

import { mesReferencia } from "@/lib/dias-operacao";
import type { PeriodoSelecionado } from "@/lib/dashboard-periodo";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMedia(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function VeiculosResumoCard({
  resumo,
  periodo,
}: {
  resumo: DashboardResumo;
  /** A coluna "Mês" segue o mesmo mês de referência de `resumo.mes` (mês de periodo.fim) — ver mesReferencia(). */
  periodo: PeriodoSelecionado;
}) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const { dia: diaAtual, mesLabel } = mesReferencia(periodo);
  const mediaSemana = resumo.semana.qtd_servicos / 7;
  const mediaMes = resumo.mes.qtd_servicos / diaAtual;

  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;
  const capacidadeTotal = unidadesConsideradas.reduce(
    (acc, u) => acc + (u.capacidade_dia ?? 0) + (u.capacidade_dia_moto ?? 0),
    0
  );
  const ocupacao = capacidadeTotal > 0 ? Math.round((resumo.hoje.qtd_servicos / capacidadeTotal) * 100) : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Car className="size-4" />
          Veículos atendidos
        </CardTitle>
        {ocupacao !== null && (
          <Badge variant={ocupacao >= 90 ? "warning" : "outline"}>
            {ocupacao}% da capacidade hoje ({resumo.hoje.qtd_servicos}/{capacidadeTotal})
          </Badge>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.hoje.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground">Hoje</span>
        </div>
        <div className="flex flex-col gap-0.5 border-x border-border">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.semana.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground">Semana</span>
          <span className="text-xs text-muted-foreground">média {formatarMedia(mediaSemana)}/dia</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.mes.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground capitalize">{mesLabel}</span>
          <span className="text-xs text-muted-foreground">média {formatarMedia(mediaMes)}/dia</span>
        </div>
      </CardContent>
    </Card>
  );
}
