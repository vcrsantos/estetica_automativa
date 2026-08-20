"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardInsights } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PontoDiario = DashboardInsights["evolucao_diaria"][number];
type Ponto = PontoDiario & { mediaMovel: number };

// Design system fechado deste gráfico (cores/tamanhos exatos fornecidos, daí
// hex fixos em vez dos tokens de tema) — mas com um par claro/escuro, pra se
// reajustar quando o site estiver no modo escuro em vez de ficar sempre
// claro. O par escuro reaproveita os mesmos tons de amarelo/laranja já
// usados no tema dark automotive do resto do dashboard (--chart-1/--chart-4).
const PALETA_CLARA = {
  background: "#FFFFFF",
  primary: "#F9C400",
  trend: "#FF8A00",
  dataDark: "#111111",
  textPrimary: "#333333",
  textSecondary: "#666666",
  textMuted: "#999999",
  grid: "#E7E7E7",
  border: "#ECECEC",
};

const PALETA_ESCURA = {
  background: "#10161A",
  primary: "#FFD600",
  trend: "#FFB800",
  dataDark: "#F7F7F5",
  textPrimary: "#F7F7F5",
  textSecondary: "#A7ADB0",
  textMuted: "#7C8790",
  grid: "#20282D",
  border: "#20282D",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarMoedaCompacta(valor: number) {
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(1)}K`;
  return `R$ ${valor.toFixed(0)}`;
}

function formatarDiaCurto(diaIso: string) {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

/** Média móvel de 7 dias — usa quantos dias anteriores estiverem disponíveis quando a janela ainda não está cheia. */
function calcularMediaMovel(dados: PontoDiario[], janela = 7): Ponto[] {
  return dados.map((ponto, i) => {
    const fatia = dados.slice(Math.max(0, i - janela + 1), i + 1);
    const media = fatia.reduce((acc, p) => acc + p.faturamento, 0) / fatia.length;
    return { ...ponto, mediaMovel: media };
  });
}

function TooltipConteudo({
  active,
  payload,
  cores,
}: {
  active?: boolean;
  payload?: { payload: Ponto }[];
  cores: typeof PALETA_CLARA;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div
      className="rounded-md px-3 py-2 text-sm shadow-md"
      style={{ background: cores.background, border: `1px solid ${cores.border}` }}
    >
      <p className="font-medium" style={{ color: cores.textPrimary }}>
        {formatarDiaCurto(item.dia)}
      </p>
      <p style={{ color: cores.textSecondary }}>{formatarMoeda(item.faturamento)}</p>
      <p className="text-xs" style={{ color: cores.textMuted }}>
        média 7d: {formatarMoeda(item.mediaMovel)}
      </p>
      <p className="text-xs" style={{ color: cores.textMuted }}>
        {item.qtd_servicos} veículo{item.qtd_servicos === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function ItemLegenda({
  cor,
  label,
  corTexto,
  tracejado,
}: {
  cor: string;
  label: string;
  corTexto: string;
  tracejado?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: corTexto }}>
      <span
        className="h-0.5 w-3 shrink-0 rounded-full"
        style={{
          backgroundColor: tracejado ? "transparent" : cor,
          backgroundImage: tracejado
            ? `repeating-linear-gradient(90deg, ${cor} 0 3px, transparent 3px 5px)`
            : undefined,
        }}
      />
      {label}
    </div>
  );
}

/** Gráfico combinado (seção 3.4 do escopo de melhorias): faturamento em barras, veículos/dia em linha sobre um eixo secundário e média móvel de 7 dias tracejada — substitui os dois gráficos separados de antes. */
export function GraficoCombinado({
  dados,
  titulo = "Faturamento e veículos",
}: {
  dados: PontoDiario[];
  titulo?: string;
}) {
  const pontos = calcularMediaMovel(dados);
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = React.useState(false);

  React.useEffect(() => {
    // next-themes só sabe o tema real depois de ler o localStorage no
    // navegador — até lá, cliente e servidor têm que renderizar o mesmo
    // placeholder, senão a hidratação quebra.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  const escuro = montado && resolvedTheme === "dark";
  const cores = escuro ? PALETA_ESCURA : PALETA_CLARA;

  return (
    <Card
      className="gap-4 rounded-[8px] shadow-none"
      style={{ background: cores.background, borderColor: cores.border }}
    >
      <CardHeader className="px-5 pt-5">
        <CardTitle className="text-sm font-medium" style={{ color: cores.textPrimary }}>
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={cores.grid} strokeWidth={1} />
            <XAxis
              dataKey="dia"
              tickFormatter={formatarDiaCurto}
              tickLine={false}
              axisLine={false}
              tick={{ fill: cores.textMuted, fontSize: 12 }}
              interval={2}
            />
            <YAxis
              yAxisId="faturamento"
              tickFormatter={formatarMoedaCompacta}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: cores.textMuted, fontSize: 12 }}
              label={{ value: "R$", position: "top", offset: 12, fill: cores.textMuted, fontSize: 11 }}
            />
            <YAxis
              yAxisId="veiculos"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: cores.textMuted, fontSize: 12 }}
              label={{ value: "Veículos", position: "top", offset: 12, fill: cores.textMuted, fontSize: 11 }}
            />
            <Tooltip cursor={{ fill: cores.grid, opacity: 0.4 }} content={<TooltipConteudo cores={cores} />} />
            <Bar yAxisId="faturamento" dataKey="faturamento" fill={cores.primary} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Line
              yAxisId="faturamento"
              type="monotone"
              dataKey="mediaMovel"
              stroke={cores.trend}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              yAxisId="veiculos"
              type="monotone"
              dataKey="qtd_servicos"
              stroke={cores.dataDark}
              strokeWidth={2}
              dot={{ r: 2, fill: cores.primary, stroke: cores.dataDark, strokeWidth: 1.5 }}
              activeDot={{ r: 3, fill: cores.primary, stroke: cores.dataDark, strokeWidth: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <ItemLegenda cor={cores.primary} label="Faturamento" corTexto={cores.textSecondary} />
          <ItemLegenda cor={cores.trend} label="Média móvel (7 dias)" corTexto={cores.textSecondary} tracejado />
          <ItemLegenda cor={cores.dataDark} label="Veículos" corTexto={cores.textSecondary} />
        </div>
      </CardContent>
    </Card>
  );
}
