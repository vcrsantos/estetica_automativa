"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Calendar, Car, Percent, Plus, Receipt, RefreshCcw, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import { gerarInsights, type ContextoMeta } from "@/lib/dashboard-insights-texto";
import { calcularVariacao } from "@/lib/dashboard-variacao";
import { calcularPeriodo, type PeriodoId } from "@/lib/dashboard-periodo";
import { contarDiasOperacao, mesReferencia } from "@/lib/dias-operacao";
import type { DashboardInsights, DashboardResumo, FormaPagamento, PorteVeiculo } from "@/types/database";
import { StatCard } from "@/components/dashboard/stat-card";
import { MetaFaturamentoCard } from "@/components/dashboard/meta-faturamento-card";
import { MetasDoMesCard } from "@/components/dashboard/metas-do-mes-card";
import { SeletorPeriodo } from "@/components/dashboard/seletor-periodo";
import { GraficoCombinado } from "@/components/dashboard/grafico-combinado";
import { VeiculosResumoCard } from "@/components/dashboard/veiculos-resumo-card";
import { FaixaOperacional } from "@/components/dashboard/faixa-operacional";
import { FilaDeAcao } from "@/components/dashboard/fila-de-acao";
import { BarListChart } from "@/components/dashboard/bar-list-chart";
import { DonutChart, agruparTopCategorias } from "@/components/dashboard/donut-chart";
import { ComparativoUnidadesTabela } from "@/components/dashboard/comparativo-unidades-tabela";
import { AtividadeRecente } from "@/components/dashboard/atividade-recente";
import { AcoesPrioritarias } from "@/components/dashboard/acoes-prioritarias";
import { NovosXRecorrentesCard } from "@/components/dashboard/novos-x-recorrentes-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ticketMedio(faturamento: number, qtdServicos: number) {
  return qtdServicos > 0 ? faturamento / qtdServicos : 0;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function TituloSecao({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <h2 className="text-[11px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
        {children}
      </h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

export function DashboardContent({
  nomeUsuario,
  isAdmin,
}: {
  nomeUsuario: string;
  isAdmin: boolean;
}) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const [resumo, setResumo] = React.useState<DashboardResumo | null>(null);
  const [insights, setInsights] = React.useState<DashboardInsights | null>(null);
  const [servicosAtivos, setServicosAtivos] = React.useState<string[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [periodoId, setPeriodoId] = React.useState<PeriodoId>("mes");
  const [personalizado, setPersonalizado] = React.useState({ inicio: hojeIso(), fim: hojeIso() });

  const periodo = React.useMemo(
    () => calcularPeriodo(periodoId, personalizado),
    [periodoId, personalizado]
  );
  const periodoInicioMs = periodo.inicio.getTime();
  const diasNoPeriodo = Math.max(
    1,
    Math.round((periodo.fim.getTime() - periodo.inicio.getTime()) / 86400000) + 1
  );
  const periodoFimMs = periodo.fim.getTime();

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();
      const [{ data: dadosResumo }, { data: dadosInsights }, { data: dadosServicos }] = await Promise.all([
        supabase.rpc("dashboard_resumo", {
          p_unidade_id: unidadeSelecionadaId,
          p_inicio: new Date(periodoInicioMs).toISOString(),
          p_fim: new Date(periodoFimMs).toISOString(),
        }),
        supabase.rpc("dashboard_insights", {
          p_unidade_id: unidadeSelecionadaId,
          p_inicio: new Date(periodoInicioMs).toISOString(),
          p_fim: new Date(periodoFimMs).toISOString(),
        }),
        supabase.from("servicos").select("nome").eq("ativo", true),
      ]);
      if (!cancelado) {
        setResumo(dadosResumo);
        setInsights(dadosInsights);
        setServicosAtivos((dadosServicos ?? []).map((s) => s.nome));
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId, periodoInicioMs, periodoFimMs]);

  const pronto = !carregando && resumo && insights;

  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;
  const metaMensal = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);

  // Mesmo mês de referência dos cards de Faturamento e Metas do mês (mês de
  // periodo.fim) — todo indicador de "dias de operação"/"mês" no dashboard
  // segue o período selecionado, não o mês-calendário real fixo.
  const { ano, mes, dia: diaAtual, mesLabel } = mesReferencia(periodo);
  const diasOperacaoTotal = contarDiasOperacao(ano, mes);
  const diasOperacaoDecorridos = Math.min(diasOperacaoTotal, contarDiasOperacao(ano, mes, diaAtual));
  const diasOperacaoRestantes = Math.max(0, diasOperacaoTotal - diasOperacaoDecorridos);
  const fimDoMes = new Date(ano, mes + 1, 0);

  const contextoMeta: ContextoMeta = {
    metaMensal,
    diasOperacaoTotal,
    diasOperacaoDecorridos,
    diasOperacaoRestantes,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {nomeUsuario.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Faturamento e panorama do negócio.</p>
        </div>
        <Button variant="gradient" render={<Link href="/ordens/novo" />} nativeButton={false}>
          <Plus className="size-4" />
          Nova OS
        </Button>
      </div>

      <SeletorPeriodo
        periodoId={periodoId}
        onPeriodoIdChange={setPeriodoId}
        personalizado={personalizado}
        onPersonalizadoChange={setPersonalizado}
        periodo={periodo}
      />

      <div className="flex flex-col gap-6">
        {!pronto ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 lg:grid-cols-12">
              <Skeleton className="h-28 w-full lg:col-span-6" />
              <Skeleton className="h-28 w-full lg:col-span-3" />
              <Skeleton className="h-28 w-full lg:col-span-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-4 lg:grid-cols-[1.62fr_1fr]">
              <Skeleton className="h-[380px] w-full" />
              <Skeleton className="h-[380px] w-full" />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-56 w-full" />
            </div>
          </div>
        ) : (
          <>
            {(() => {
              const diasComVenda = (insights.evolucao_diaria ?? []).filter((d) => d.faturamento > 0).length;
              const totalDiasPeriodo = (insights.evolucao_diaria ?? []).length || diasNoPeriodo;
              const nomesVendidos = new Set((insights.top_servicos ?? []).map((s) => s.nome));
              const naoVendidos = servicosAtivos.filter((nome) => !nomesVendidos.has(nome));
              const dadosMixServicos = agruparTopCategorias(
                (insights.top_servicos ?? []).map((s) => ({ label: s.nome, valor: s.faturamento }))
              );
              const valorPendenteAtraso = Math.max(
                0,
                resumo.periodo.faturamento - resumo.valor_recebido_em_dia
              );
              const percentualRecebidoEmDia =
                resumo.periodo.faturamento > 0
                  ? (resumo.valor_recebido_em_dia / resumo.periodo.faturamento) * 100
                  : 100;

              return (
                <>
                  <div className="grid gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                      <MetaFaturamentoCard resumo={resumo} isAdmin={isAdmin} periodo={periodo} />
                    </div>
                    <div className="lg:col-span-3">
                      <StatCard
                        icon={Wallet}
                        titulo={`Faturamento (${periodo.label})`}
                        valor={formatarMoeda(resumo.periodo.faturamento)}
                        variacao={calcularVariacao(resumo.periodo.faturamento, resumo.periodo_anterior.faturamento)}
                        formatarVariacaoValor={formatarMoeda}
                        comparativoLabel="vs período anterior"
                        legenda={`${diasComVenda} de ${totalDiasPeriodo} dias com venda`}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <StatCard
                        icon={Car}
                        titulo={`Veículos atendidos (${periodo.label})`}
                        valor={String(resumo.periodo.qtd_servicos)}
                        variacao={calcularVariacao(resumo.periodo.qtd_servicos, resumo.periodo_anterior.qtd_servicos)}
                        formatarVariacaoValor={(v) => String(Math.round(v))}
                        comparativoLabel="vs período anterior"
                        legenda={`média: ${(resumo.periodo.qtd_servicos / diasNoPeriodo).toFixed(1)}/dia`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      icon={Receipt}
                      titulo={`Ticket médio (${periodo.label})`}
                      valor={formatarMoeda(ticketMedio(resumo.periodo.faturamento, resumo.periodo.qtd_servicos))}
                      variacao={calcularVariacao(
                        ticketMedio(resumo.periodo.faturamento, resumo.periodo.qtd_servicos),
                        ticketMedio(resumo.periodo_anterior.faturamento, resumo.periodo_anterior.qtd_servicos)
                      )}
                      formatarVariacaoValor={formatarMoeda}
                      comparativoLabel="vs período anterior"
                      legenda={`base: ${resumo.periodo.qtd_servicos} atendimento${resumo.periodo.qtd_servicos === 1 ? "" : "s"}`}
                    />
                    {(() => {
                      const clientesBase = insights.taxa_retorno?.clientes_base ?? 0;
                      const baseInsuficiente = clientesBase < 10;
                      return (
                        <StatCard
                          icon={RefreshCcw}
                          titulo="Taxa de retorno (90 dias)"
                          valor={baseInsuficiente ? "—" : `${insights.taxa_retorno?.taxa_retorno_90d ?? 0}%`}
                          variacao={
                            baseInsuficiente
                              ? undefined
                              : calcularVariacao(
                                  insights.taxa_retorno?.taxa_retorno_90d ?? 0,
                                  insights.taxa_retorno?.taxa_retorno_90d_anterior ?? 0
                                )
                          }
                          formatarVariacaoValor={(v) => `${v.toFixed(1)} p.p.`}
                          comparativoLabel="vs período anterior"
                          legenda={
                            baseInsuficiente
                              ? `base pequena: ${clientesBase} cliente${clientesBase === 1 ? "" : "s"} em 90 dias`
                              : insights.taxa_retorno?.intervalo_medio_dias != null
                                ? `intervalo médio entre visitas: ${insights.taxa_retorno.intervalo_medio_dias.toFixed(0)} dias`
                                : undefined
                          }
                        />
                      );
                    })()}
                    <StatCard
                      icon={Calendar}
                      titulo="Dias de operação restantes"
                      valor={String(diasOperacaoRestantes)}
                      legenda={`seg a sáb · ${mesLabel} encerra em ${fimDoMes.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
                    />
                    <StatCard
                      icon={BadgeCheck}
                      titulo="Recebimento em dia"
                      valor={`${percentualRecebidoEmDia.toFixed(0)}%`}
                      tom={percentualRecebidoEmDia < 90 ? "negativo" : undefined}
                      legendaTom={valorPendenteAtraso > 0 ? "negativo" : undefined}
                      legenda={
                        valorPendenteAtraso > 0
                          ? `${formatarMoeda(valorPendenteAtraso)} pendentes`
                          : "Sem pendências vencidas"
                      }
                    />
                  </div>

                  <AcoesPrioritarias insights={gerarInsights(resumo, insights, contextoMeta)} />

                  <div className="flex flex-col gap-3">
                    <TituloSecao>Operação agora</TituloSecao>
                    <FaixaOperacional resumo={resumo} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.62fr_1fr]">
                    <GraficoCombinado
                      dados={insights.evolucao_diaria ?? []}
                      titulo={`Histórico de faturamento (${periodo.label})`}
                    />
                    <MetasDoMesCard resumo={resumo} periodo={periodo} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                    <ComparativoUnidadesTabela
                      titulo={`Unidades · ${periodo.label}`}
                      unidades={insights.comparativo_unidades ?? []}
                    />
                    <DonutChart
                      titulo={`Mix de serviços (${periodo.label})`}
                      dados={dadosMixServicos}
                      formatarValor={formatarMoeda}
                      vazio="Sem serviços registrados no período."
                      mostrarCentro
                      contagemLabel="serviço"
                      naoVendidos={naoVendidos}
                      fraseUnica="Todo o faturamento veio de um único serviço. Serviços de maior valor não foram vendidos no período."
                    />
                  </div>
                </>
              );
            })()}

            <div className="flex flex-col gap-3">
              <TituloSecao>Ação e histórico</TituloSecao>
              <div className="grid gap-4 sm:grid-cols-2">
                <FilaDeAcao />
                <AtividadeRecente periodo={periodo} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <TituloSecao>Mais indicadores</TituloSecao>
              <div className="grid gap-4 lg:grid-cols-2">
                <VeiculosResumoCard resumo={resumo} periodo={periodo} />
                <StatCard
                  icon={Percent}
                  titulo={`Desconto médio sobre a tabela (${periodo.label})`}
                  valor={`${insights.desconto_medio?.percentual ?? 0}%`}
                  tom={(insights.desconto_medio?.percentual ?? 0) > 15 ? "negativo" : undefined}
                  legenda={`receita não realizada: ${formatarMoeda(insights.desconto_medio?.receita_nao_realizada ?? 0)}`}
                />
                <BarListChart
                  titulo={`Clientes e receita por origem (${periodo.label})`}
                  dados={(insights.por_origem ?? []).map((o) => ({
                    label: o.origem,
                    valor: o.receita,
                    sublabel: `${o.qtd_clientes} cliente${o.qtd_clientes === 1 ? "" : "s"}`,
                  }))}
                  formatarValor={formatarMoeda}
                  vazio="Sem clientes com serviços no período."
                />
                <BarListChart
                  titulo={`Faturamento por porte (${periodo.label})`}
                  dados={(insights.faturamento_por_porte ?? []).map((p) => ({
                    label: PORTE_LABELS[p.porte as PorteVeiculo] ?? p.porte,
                    valor: p.faturamento,
                    sublabel: `${p.qtd_servicos} serviço${p.qtd_servicos === 1 ? "" : "s"}`,
                  }))}
                  formatarValor={formatarMoeda}
                  vazio="Sem serviços com veículo no período."
                />
                <DonutChart
                  titulo={`Formas de pagamento (${periodo.label})`}
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
                  vazio="Sem pagamentos registrados no período."
                  href="/financeiro"
                  hrefLabel="Ver formas de pagamento"
                />
                <BarListChart
                  titulo={`Ranking de clientes por valor gasto (${periodo.label})`}
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
                  periodoLabel={periodo.label}
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

        <p className="text-center text-xs text-muted-foreground">
          Data de abertura da OS como referência para faturamento.
        </p>
      </div>
    </div>
  );
}
