"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { contarDiasOperacao, mesReferencia } from "@/lib/dias-operacao";
import type { PeriodoSelecionado } from "@/lib/dashboard-periodo";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Design system fechado deste cartão (card-metas-mensais-polibrilho.md),
// com um par claro/escuro pra se reajustar sozinho no modo escuro — mesmo
// padrão já usado nos demais gráficos/cartões com design system próprio
// deste dashboard.
const PALETA_CLARA = {
  background: "#ffffff",
  border: "#e4e2dc",
  titulo: "#6b665c",
  textPrimary: "#292620",
  textSecondary: "#777168",
  textMuted: "#a7a097",
  yellow: "#ffc400",
  yellowDonut: "#ffbc32",
  yellowSoft: "#fff0d4",
  yellowDark: "#9a7100",
  track: "#e1dacb",
  donutTrack: "#e8e1d4",
  marker: "#8b877f",
  success: "#438451",
  successBg: "#ecf8ef",
  successBorder: "#b8dfc2",
  belowBg: "#fff0d4",
  belowBorder: "#e9c681",
  belowText: "#c48a2c",
  onTrackBg: "#f3f3f1",
  onTrackBorder: "#d8d6d1",
  onTrackText: "#66635d",
  valorProjetado: "#c78a22",
};

const PALETA_ESCURA = {
  background: "#10161a",
  border: "#20282d",
  titulo: "#a7ada0",
  textPrimary: "#f7f7f5",
  textSecondary: "#a7ada0",
  textMuted: "#7c8790",
  yellow: "#ffd600",
  yellowDonut: "#ffc94d",
  yellowSoft: "rgba(255,214,0,0.12)",
  yellowDark: "#ffd600",
  track: "rgba(255,255,255,0.1)",
  donutTrack: "rgba(255,255,255,0.1)",
  marker: "rgba(255,255,255,0.45)",
  success: "#5fce7c",
  successBg: "rgba(95,206,124,0.12)",
  successBorder: "rgba(95,206,124,0.35)",
  belowBg: "rgba(255,214,0,0.1)",
  belowBorder: "rgba(255,214,0,0.3)",
  belowText: "#ffd600",
  onTrackBg: "rgba(255,255,255,0.06)",
  onTrackBorder: "rgba(255,255,255,0.15)",
  onTrackText: "#a7ada0",
  valorProjetado: "#ffd600",
};

type Cores = typeof PALETA_CLARA;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function useCoresMetas(): Cores {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = React.useState(false);

  React.useEffect(() => {
    // next-themes só sabe o tema real depois de ler o localStorage no
    // navegador — até lá, cliente e servidor têm que renderizar o mesmo
    // placeholder, senão a hidratação quebra.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  return montado && resolvedTheme === "dark" ? PALETA_ESCURA : PALETA_CLARA;
}

function DonutMeta({ percentual, cores }: { percentual: number; cores: Cores }) {
  const raio = 47;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.min(100, Math.max(0, percentual));
  const offset = circunferencia * (1 - preenchido / 100);

  return (
    <div className="relative flex size-[110px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 110 110" className="size-[110px] -rotate-90">
        <circle cx="55" cy="55" r={raio} fill="none" stroke={cores.donutTrack} strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={raio}
          fill="none"
          stroke={cores.yellowDonut}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ fontSize: 28, fontWeight: 700, color: cores.textPrimary }} className="tabular-nums">
          {formatarPercentual(percentual)}
        </span>
        <span
          className="mt-0.5 uppercase"
          style={{ fontSize: 10, fontWeight: 500, color: cores.textMuted, letterSpacing: "0.08em" }}
        >
          da meta
        </span>
      </div>
    </div>
  );
}

type StatusProjecao = "above" | "on-track" | "below";

function BadgeStatus({ status, cores }: { status: StatusProjecao; cores: Cores }) {
  const config: Record<StatusProjecao, { label: string; bg: string; border: string; texto: string }> = {
    above: { label: "Acima do alvo", bg: cores.successBg, border: cores.successBorder, texto: cores.success },
    "on-track": {
      label: "Dentro do esperado",
      bg: cores.onTrackBg,
      border: cores.onTrackBorder,
      texto: cores.onTrackText,
    },
    below: { label: "Abaixo do alvo", bg: cores.belowBg, border: cores.belowBorder, texto: cores.belowText },
  };
  const c = config[status];

  return (
    <span
      className="mt-2 inline-flex h-[26px] w-fit items-center rounded-full px-3"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.texto, fontSize: 11, fontWeight: 500 }}
    >
      {c.label}
    </span>
  );
}

function BarraComMarcador({
  titulo,
  atual,
  meta,
  progressoEsperado,
  formatarValor,
  cores,
}: {
  titulo: string;
  atual: number;
  meta: number;
  progressoEsperado: number;
  formatarValor: (v: number) => string;
  cores: Cores;
}) {
  const percentual = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span style={{ fontSize: 12, color: cores.textSecondary }}>{titulo}</span>
        <span className="tabular-nums whitespace-nowrap" style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: cores.textPrimary }}>{formatarValor(atual)}</span>
          <span style={{ fontWeight: 400, color: cores.textMuted }}> / {formatarValor(meta)}</span>
        </span>
      </div>
      <div className="relative h-[9px] w-full overflow-hidden rounded-full" style={{ backgroundColor: cores.track }}>
        <div
          className="h-full rounded-full transition-[width] duration-350 ease-out"
          style={{ width: `${Math.max(percentual, percentual > 0 ? 1.5 : 0)}%`, backgroundColor: cores.yellow }}
        />
        <div
          className="absolute top-1/2 h-[10px] w-[2px] -translate-y-1/2 opacity-80"
          style={{ left: `${Math.min(100, progressoEsperado)}%`, backgroundColor: cores.marker }}
          title={`Hoje você deveria estar em ${formatarPercentual(progressoEsperado)} da meta.`}
        />
      </div>
    </div>
  );
}

/**
 * Metas do mês (card-metas-mensais-polibrilho.md) — faturamento usa a meta
 * configurada por unidade; veículos deriva a meta da capacidade diária ×
 * dias de operação do mês. A Polibrilho atende de segunda a sábado, então
 * "dia de operação" aqui exclui só domingo (não é o "dia útil" seg-sex
 * genérico do documento original).
 */
export function MetasDoMesCard({
  resumo,
  periodo,
}: {
  resumo: DashboardResumo;
  /** O "mês" deste card segue o mês de `periodo.fim` — ver mesReferencia() em lib/dias-operacao.ts. */
  periodo: PeriodoSelecionado;
}) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const cores = useCoresMetas();
  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;

  const metaFaturamento = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);
  const capacidadeAutomovel = unidadesConsideradas.reduce((acc, u) => acc + (u.capacidade_dia ?? 0), 0);
  const capacidadeMoto = unidadesConsideradas.reduce((acc, u) => acc + (u.capacidade_dia_moto ?? 0), 0);

  const { ano, mes, dia: diaAtual, mesLabel } = mesReferencia(periodo);

  const diasOperacaoTotal = contarDiasOperacao(ano, mes);
  const diasOperacaoDecorridos = Math.min(diasOperacaoTotal, contarDiasOperacao(ano, mes, diaAtual));
  const diasOperacaoRestantes = Math.max(0, diasOperacaoTotal - diasOperacaoDecorridos);

  const metaAutomovel = capacidadeAutomovel * diasOperacaoTotal;
  const metaMoto = capacidadeMoto * diasOperacaoTotal;

  const cardStyle = { background: cores.background, borderColor: cores.border };
  const tituloStyle = { fontSize: 16, fontWeight: 700, color: cores.titulo };

  if (metaFaturamento <= 0 && metaAutomovel <= 0 && metaMoto <= 0) {
    return (
      <Card className="rounded-[18px] shadow-none" style={cardStyle}>
        <CardHeader>
          <CardTitle style={tituloStyle}>Metas de {mesLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm" style={{ color: cores.textMuted }}>
            Nenhuma meta configurada ainda. Abra uma unidade específica e use o botão de configuração
            no card de faturamento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const faturamentoAtual = resumo.mes.faturamento;
  const automovelAtual = resumo.mes_veiculos_automovel;
  const motoAtual = resumo.mes_veiculos_moto;

  const percentualMeta = metaFaturamento > 0 ? (faturamentoAtual / metaFaturamento) * 100 : 0;
  const progressoEsperado = diasOperacaoTotal > 0 ? (diasOperacaoDecorridos / diasOperacaoTotal) * 100 : 0;

  const projecaoFaturamento =
    diasOperacaoDecorridos > 0 ? (faturamentoAtual / diasOperacaoDecorridos) * diasOperacaoTotal : 0;
  const percentualProjetado = metaFaturamento > 0 ? (projecaoFaturamento / metaFaturamento) * 100 : 0;

  const valorRestante = Math.max(0, metaFaturamento - faturamentoAtual);
  const metaJaAtingida = metaFaturamento > 0 && faturamentoAtual >= metaFaturamento;
  const ritmoNecessario = diasOperacaoRestantes > 0 ? valorRestante / diasOperacaoRestantes : 0;

  const status: StatusProjecao =
    percentualProjetado >= 100 ? "above" : percentualProjetado >= 90 ? "on-track" : "below";

  return (
    <Card className="rounded-[18px] shadow-none" style={cardStyle}>
      <CardHeader>
        <CardTitle style={tituloStyle}>Metas de {mesLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <DonutMeta percentual={percentualMeta} cores={cores} />
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-center sm:text-left" style={{ fontSize: 13, color: cores.textSecondary }}>
              No ritmo atual, {mesLabel} fecha em{" "}
              <span style={{ fontWeight: 700, color: cores.valorProjetado }}>
                {formatarMoeda(projecaoFaturamento)}
              </span>{" "}
              — <span style={{ color: cores.textMuted }}>{formatarPercentual(percentualProjetado)} da meta</span>.
            </p>
            <BadgeStatus status={status} cores={cores} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {metaFaturamento > 0 && (
            <BarraComMarcador
              titulo="Faturamento"
              atual={faturamentoAtual}
              meta={metaFaturamento}
              progressoEsperado={progressoEsperado}
              formatarValor={formatarMoeda}
              cores={cores}
            />
          )}
          {metaAutomovel > 0 && (
            <BarraComMarcador
              titulo="Veículos · Automóvel"
              atual={automovelAtual}
              meta={metaAutomovel}
              progressoEsperado={progressoEsperado}
              formatarValor={(v) => String(Math.round(v))}
              cores={cores}
            />
          )}
          {metaMoto > 0 && (
            <BarraComMarcador
              titulo="Veículos · Motocicleta"
              atual={motoAtual}
              meta={metaMoto}
              progressoEsperado={progressoEsperado}
              formatarValor={(v) => String(Math.round(v))}
              cores={cores}
            />
          )}
        </div>

        <div className={cn("flex flex-col")} style={{ borderTop: `1px solid ${cores.border}`, paddingTop: 16 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 13, color: cores.textSecondary }}>Ritmo necessário por dia de operação</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: metaJaAtingida ? cores.success : cores.yellowDark }}>
              {metaJaAtingida ? "Meta mensal atingida" : formatarMoeda(ritmoNecessario)}
            </span>
          </div>
          <p className="mt-2" style={{ fontSize: 11, color: cores.textMuted }}>
            A marca cinza mostra onde você deveria estar hoje ({formatarPercentual(progressoEsperado)} do mês).
            {!metaJaAtingida &&
              ` Restam ${diasOperacaoRestantes} dia${diasOperacaoRestantes === 1 ? "" : "s"} de operação — a Polibrilho atende de segunda a sábado.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
