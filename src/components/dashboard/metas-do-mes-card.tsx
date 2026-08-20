"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Trophy } from "lucide-react";

import { useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Design system fechado deste cartão ("Monthly Goals Card") — hex fixos
// como no gráfico de faturamento/veículos, com um par claro/escuro pra se
// reajustar sozinho no modo escuro (o par escuro reaproveita os tons
// amarelo/laranja já usados no tema dark automotive do resto do dashboard).
const PALETA_CLARA = {
  background: "#FFFFFF",
  primary: "#F9C400",
  progress: "#F28C00",
  textPrimary: "#202020",
  textSecondary: "#666666",
  textMuted: "#969696",
  support: "#555555",
  track: "#E8E8E8",
  donutTrack: "#E5E5E5",
  border: "#EEEEEE",
};

const PALETA_ESCURA = {
  background: "#10161A",
  primary: "#FFD600",
  progress: "#FF9500",
  textPrimary: "#F7F7F5",
  textSecondary: "#A7ADB0",
  textMuted: "#7C8790",
  support: "#A7ADB0",
  track: "rgba(255,255,255,0.1)",
  donutTrack: "rgba(255,255,255,0.1)",
  border: "#20282D",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useCoresMetas() {
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

function AnelMeta({ percentual, cores }: { percentual: number; cores: typeof PALETA_CLARA }) {
  const raio = 56;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.min(100, Math.max(0, percentual));
  const offset = circunferencia * (1 - preenchido / 100);

  return (
    <div className="relative flex size-[128px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 128 128" className="size-[128px] -rotate-90">
        <circle cx="64" cy="64" r={raio} fill="none" stroke={cores.donutTrack} strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={raio}
          fill="none"
          stroke={cores.progress}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <Trophy className="size-6" style={{ color: cores.progress }} />
        <span style={{ fontSize: 32, fontWeight: 700, color: cores.textPrimary }} className="tabular-nums">
          {preenchido.toFixed(0)}%
        </span>
        <span
          className="text-center leading-tight"
          style={{ fontSize: 12, fontWeight: 500, color: cores.support }}
        >
          da meta atingida
        </span>
      </div>
    </div>
  );
}

function BarraMeta({
  titulo,
  atual,
  meta,
  formatarValor,
  cores,
}: {
  titulo: string;
  atual: number;
  meta: number;
  formatarValor: (v: number) => string;
  cores: typeof PALETA_CLARA;
}) {
  const percentual = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 13, fontWeight: 400, color: cores.textSecondary }}>{titulo}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: cores.textPrimary }} className="tabular-nums">
        {formatarValor(atual)} / {formatarValor(meta)}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: cores.track }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percentual}%`, backgroundColor: cores.progress }}
          />
        </div>
        <span
          className="w-9 shrink-0 text-right tabular-nums"
          style={{ fontSize: 12.5, fontWeight: 600, color: cores.textSecondary }}
        >
          {percentual.toFixed(0)}%
        </span>
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
  const cores = useCoresMetas();
  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;

  const metaFaturamento = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);
  const capacidadeTotal = unidadesConsideradas.reduce((acc, u) => acc + (u.capacidade_dia ?? 0), 0);

  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const metaVeiculos = capacidadeTotal * diasNoMes;

  const cardStyle = { background: cores.background, borderColor: cores.border };
  const tituloStyle = { fontSize: 16, fontWeight: 700, color: cores.textPrimary };

  if (metaFaturamento <= 0 && metaVeiculos <= 0) {
    return (
      <Card className="gap-4 rounded-[8px] shadow-none" style={cardStyle}>
        <CardHeader className="px-5 pt-5">
          <CardTitle style={tituloStyle}>Metas do mês</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="py-6 text-center text-sm" style={{ color: cores.textMuted }}>
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
    <Card className="gap-4 rounded-[8px] shadow-none" style={cardStyle}>
      <CardHeader className="px-5 pt-5">
        <CardTitle style={tituloStyle}>Metas do mês</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4 px-5 pb-5">
        <div className="flex min-w-[180px] flex-1 flex-col gap-4">
          {metaFaturamento > 0 && (
            <BarraMeta
              titulo="Faturamento"
              atual={resumo.mes.faturamento}
              meta={metaFaturamento}
              formatarValor={formatarMoeda}
              cores={cores}
            />
          )}
          {metaVeiculos > 0 && (
            <BarraMeta
              titulo="Veículos"
              atual={resumo.mes.qtd_servicos}
              meta={metaVeiculos}
              formatarValor={(v) => String(Math.round(v))}
              cores={cores}
            />
          )}
        </div>
        <AnelMeta percentual={percentualPrincipal} cores={cores} />
      </CardContent>
    </Card>
  );
}
