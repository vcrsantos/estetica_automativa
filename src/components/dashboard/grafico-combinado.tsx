"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardInsights } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PontoDiario = DashboardInsights["evolucao_diaria"][number];
type Ponto = PontoDiario & { mediaMovel: number };

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
}: {
  active?: boolean;
  payload?: { payload: Ponto }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{formatarDiaCurto(item.dia)}</p>
      <p className="text-muted-foreground">{formatarMoeda(item.faturamento)}</p>
      <p className="text-xs text-muted-foreground">média 7d: {formatarMoeda(item.mediaMovel)}</p>
      <p className="text-xs text-muted-foreground">
        {item.qtd_servicos} veículo{item.qtd_servicos === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function ItemLegenda({ cor, label, tracejado }: { cor: string; label: string; tracejado?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: cor, opacity: tracejado ? 0.7 : 1 }}
      />
      {label}
    </div>
  );
}

/** Gráfico combinado (seção 3.4 do escopo de melhorias): faturamento em barras, veículos/dia em linha sobre um eixo secundário e média móvel de 7 dias pontilhada — substitui os dois gráficos separados de antes. */
export function GraficoCombinado({
  dados,
  titulo = "Faturamento e veículos",
}: {
  dados: PontoDiario[];
  titulo?: string;
}) {
  const pontos = calcularMediaMovel(dados);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis
              dataKey="dia"
              tickFormatter={formatarDiaCurto}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              interval={2}
            />
            <YAxis
              yAxisId="faturamento"
              tickFormatter={formatarMoedaCompacta}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              yAxisId="veiculos"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: "var(--accent)" }} content={<TooltipConteudo />} />
            <Bar yAxisId="faturamento" dataKey="faturamento" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Line
              yAxisId="faturamento"
              type="monotone"
              dataKey="mediaMovel"
              stroke="var(--chart-4)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              yAxisId="veiculos"
              type="monotone"
              dataKey="qtd_servicos"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--chart-2)" }}
              activeDot={{ r: 4, fill: "var(--chart-2)", stroke: "var(--card)", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <ItemLegenda cor="var(--chart-1)" label="Faturamento" />
          <ItemLegenda cor="var(--chart-4)" label="Média móvel (7 dias)" tracejado />
          <ItemLegenda cor="var(--chart-2)" label="Veículos" />
        </div>
      </CardContent>
    </Card>
  );
}
