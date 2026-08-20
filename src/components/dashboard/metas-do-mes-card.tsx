"use client";

import { Trophy } from "lucide-react";

import { useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AnelMeta({ percentual }: { percentual: number }) {
  const raio = 52;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.min(100, Math.max(0, percentual));
  const offset = circunferencia * (1 - preenchido / 100);

  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="size-28 -rotate-90">
        <circle cx="60" cy="60" r={raio} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={raio}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <Trophy className="size-5 text-primary" />
        <span className="font-heading text-xl font-bold tabular-nums">{preenchido.toFixed(0)}%</span>
        <span className="text-center text-[10px] leading-tight text-muted-foreground">da meta atingida</span>
      </div>
    </div>
  );
}

function BarraMeta({
  titulo,
  atual,
  meta,
  formatarValor,
}: {
  titulo: string;
  atual: number;
  meta: number;
  formatarValor: (v: number) => string;
}) {
  const percentual = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{titulo}</span>
        <span className="font-medium tabular-nums">
          {formatarValor(atual)} / {formatarValor(meta)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Metas do mês (seção 4.1/4.8 do escopo de melhorias) — faturamento usa a
 * meta configurada por unidade; veículos deriva a meta da capacidade
 * diária × dias do mês (não existe um campo de meta de veículos à parte,
 * pra não duplicar configuração).
 */
export function MetasDoMesCard({ resumo }: { resumo: DashboardResumo }) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;

  const metaFaturamento = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);
  const capacidadeTotal = unidadesConsideradas.reduce((acc, u) => acc + (u.capacidade_dia ?? 0), 0);

  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const metaVeiculos = capacidadeTotal * diasNoMes;

  if (metaFaturamento <= 0 && metaVeiculos <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Metas do mês</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma meta configurada ainda. Abra uma unidade específica e use o botão de configuração
            no card de faturamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const percentualPrincipal =
    metaFaturamento > 0
      ? (resumo.mes.faturamento / metaFaturamento) * 100
      : metaVeiculos > 0
        ? (resumo.mes.qtd_servicos / metaVeiculos) * 100
        : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Metas do mês</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[180px] flex-1 flex-col gap-4">
          {metaFaturamento > 0 && (
            <BarraMeta
              titulo="Faturamento"
              atual={resumo.mes.faturamento}
              meta={metaFaturamento}
              formatarValor={formatarMoeda}
            />
          )}
          {metaVeiculos > 0 && (
            <BarraMeta
              titulo="Veículos"
              atual={resumo.mes.qtd_servicos}
              meta={metaVeiculos}
              formatarValor={(v) => String(Math.round(v))}
            />
          )}
        </div>
        <AnelMeta percentual={percentualPrincipal} />
      </CardContent>
    </Card>
  );
}
