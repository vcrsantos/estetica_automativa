"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, CreditCard, DollarSign, Plus, TrendingUp, Truck, Users, Wrench } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import { gerarInsights } from "@/lib/dashboard-insights-texto";
import type { DashboardInsights, DashboardResumo, FormaPagamento, PorteVeiculo } from "@/types/database";
import { PeriodoCard } from "@/components/dashboard/periodo-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EvolucaoDiariaChart } from "@/components/dashboard/evolucao-diaria-chart";
import { BarListChart } from "@/components/dashboard/bar-list-chart";
import { DonutChart, agruparTopCategorias } from "@/components/dashboard/donut-chart";
import { AtividadeRecente } from "@/components/dashboard/atividade-recente";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { NovosXRecorrentesCard } from "@/components/dashboard/novos-x-recorrentes-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

function OperacionalTile({
  icon: Icon,
  titulo,
  valor,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:bg-accent" : undefined}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-4.5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className="font-heading text-lg font-bold tabular-nums">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

function TituloSecao({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-muted-foreground">{children}</h2>;
}

export function DashboardContent({ nomeUsuario }: { nomeUsuario: string }) {
  const { unidadeSelecionadaId } = useUnidade();
  const [resumo, setResumo] = React.useState<DashboardResumo | null>(null);
  const [insights, setInsights] = React.useState<DashboardInsights | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();
      const [{ data: dadosResumo }, { data: dadosInsights }] = await Promise.all([
        supabase.rpc("dashboard_resumo", { p_unidade_id: unidadeSelecionadaId }),
        supabase.rpc("dashboard_insights", { p_unidade_id: unidadeSelecionadaId }),
      ]);
      if (!cancelado) {
        setResumo(dadosResumo);
        setInsights(dadosInsights);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  const pronto = !carregando && resumo && insights;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {nomeUsuario.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Faturamento e panorama do negócio.</p>
        </div>
        <Button render={<Link href="/ordens/novo" />} nativeButton={false}>
          <Plus className="size-4" />
          Nova OS
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          {!pronto ? (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
                <Skeleton className="h-64 w-full" />
              </div>
              <Skeleton className="h-56 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard
                    icon={DollarSign}
                    titulo="Faturamento hoje"
                    valor={formatarMoeda(resumo.hoje.faturamento)}
                    variacao={variacaoPercentual(resumo.hoje.faturamento, resumo.ontem.faturamento)}
                    comparativoLabel="vs ontem"
                  />
                  <StatCard
                    icon={BarChart3}
                    titulo="Faturamento do mês"
                    valor={formatarMoeda(resumo.mes.faturamento)}
                    variacao={variacaoPercentual(resumo.mes.faturamento, resumo.mes_anterior.faturamento)}
                    comparativoLabel="vs mês anterior"
                  />
                  <StatCard
                    icon={Wrench}
                    titulo="Em execução agora"
                    valor={String(resumo.em_execucao)}
                    href="/fila-do-dia"
                    hrefLabel="Ver fila do dia"
                  />
                  <StatCard
                    icon={CreditCard}
                    titulo="Contas a receber"
                    valor={formatarMoeda(resumo.contas_a_receber)}
                    href="/contas-a-receber"
                    hrefLabel="Ver contas a receber"
                  />
                </div>
                <EvolucaoDiariaChart dados={insights.evolucao_diaria ?? []} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <PeriodoCard
                  icon={TrendingUp}
                  titulo="Esta semana"
                  atual={resumo.semana}
                  anterior={resumo.semana_anterior}
                />
                <OperacionalTile
                  icon={Truck}
                  titulo="Previsão de entrega hoje"
                  valor={String(resumo.previstos_hoje)}
                  href="/fila-do-dia"
                />
                <OperacionalTile
                  icon={Users}
                  titulo="Clientes inativos (15+ dias)"
                  valor={String(resumo.clientes_inativos)}
                  href="/reativacao"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <AtividadeRecente />
                <DonutChart
                  titulo="Formas de pagamento (este mês)"
                  dados={agruparTopCategorias(
                    (insights.formas_pagamento ?? []).map((f) => ({
                      label:
                        f.forma_pagamento === "nao_informado"
                          ? "Não informado"
                          : FORMA_PAGAMENTO_LABELS[f.forma_pagamento as FormaPagamento],
                      valor: f.faturamento,
                    }))
                  )}
                  formatarValor={formatarMoeda}
                  vazio="Sem pagamentos registrados este mês."
                  href="/financeiro"
                  hrefLabel="Ver detalhamento financeiro"
                />
              </div>

              <div className="flex flex-col gap-3">
                <TituloSecao>Faturamento</TituloSecao>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BarListChart
                    titulo="Serviços mais vendidos (este mês)"
                    dados={(insights.top_servicos ?? []).map((s) => ({
                      label: s.nome,
                      valor: s.faturamento,
                      sublabel: `${s.qtd} serviço${s.qtd === 1 ? "" : "s"}`,
                    }))}
                    formatarValor={formatarMoeda}
                    vazio="Sem serviços registrados este mês."
                  />
                  <BarListChart
                    titulo="Faturamento por porte (este mês)"
                    dados={(insights.faturamento_por_porte ?? []).map((p) => ({
                      label: PORTE_LABELS[p.porte as PorteVeiculo] ?? p.porte,
                      valor: p.faturamento,
                      sublabel: `${p.qtd_servicos} serviço${p.qtd_servicos === 1 ? "" : "s"}`,
                    }))}
                    formatarValor={formatarMoeda}
                    vazio="Sem serviços com veículo este mês."
                  />
                </div>

                {!unidadeSelecionadaId && (insights.comparativo_unidades ?? []).length > 1 && (
                  <BarListChart
                    titulo="Comparativo entre unidades (este mês)"
                    dados={insights.comparativo_unidades.map((u) => ({
                      label: u.unidade_nome,
                      valor: u.faturamento,
                      sublabel: `${u.qtd_servicos} serviço${u.qtd_servicos === 1 ? "" : "s"}`,
                    }))}
                    formatarValor={formatarMoeda}
                    vazio="Sem dados este mês."
                  />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <TituloSecao>Clientes</TituloSecao>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BarListChart
                    titulo="Ranking de clientes por valor gasto"
                    dados={(insights.top_clientes ?? []).map((c) => ({
                      label: c.nome,
                      valor: c.total_gasto,
                      sublabel: `${c.qtd_servicos} serviço${c.qtd_servicos === 1 ? "" : "s"}`,
                    }))}
                    formatarValor={formatarMoeda}
                    vazio="Sem clientes com serviços ainda."
                  />
                  <NovosXRecorrentesCard
                    novos={insights.novos_x_recorrentes?.novos ?? 0}
                    recorrentes={insights.novos_x_recorrentes?.recorrentes ?? 0}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Fila do dia</p>
                  <p className="text-sm text-muted-foreground">Acompanhe as OS em andamento.</p>
                </div>
                <Button variant="outline" render={<Link href="/fila-do-dia" />} nativeButton={false}>
                  Abrir
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Orçamentos</p>
                  <p className="text-sm text-muted-foreground">Crie e envie orçamentos por WhatsApp.</p>
                </div>
                <Button variant="outline" render={<Link href="/orcamentos" />} nativeButton={false}>
                  Abrir
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-4 lg:self-start">
          {!pronto ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <InsightsPanel insights={gerarInsights(resumo, insights)} />
          )}
        </aside>
      </div>
    </div>
  );
}
