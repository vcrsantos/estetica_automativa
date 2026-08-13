"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardInsights } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMoedaCompacta(valor: number) {
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(1)}K`;
  return `R$ ${valor.toFixed(0)}`;
}

function formatarDiaCurto(diaIso: string) {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

function TooltipConteudo({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DashboardInsights["evolucao_diaria"][number] }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{formatarDiaCurto(item.dia)}</p>
      <p className="text-muted-foreground">
        {item.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <p className="text-xs text-muted-foreground">
        {item.qtd_servicos} serviço{item.qtd_servicos === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function EvolucaoDiariaChart({ dados }: { dados: DashboardInsights["evolucao_diaria"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Faturamento — últimos 14 dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="evolucaoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={formatarMoedaCompacta}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip cursor={{ stroke: "var(--border)" }} content={<TooltipConteudo />} />
            <Area
              type="monotone"
              dataKey="faturamento"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#evolucaoFill)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
