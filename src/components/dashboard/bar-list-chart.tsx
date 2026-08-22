"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ItemBarra = {
  label: string;
  valor: number;
  sublabel?: string;
};

function TooltipConteudo({
  active,
  payload,
  formatarValor,
}: {
  active?: boolean;
  payload?: { payload: ItemBarra }[];
  formatarValor: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{item.label}</p>
      <p className="text-muted-foreground">{formatarValor(item.valor)}</p>
      {item.sublabel && <p className="text-xs text-muted-foreground">{item.sublabel}</p>}
    </div>
  );
}

export function BarListChart({
  titulo,
  dados,
  formatarValor,
  vazio,
}: {
  titulo: string;
  dados: ItemBarra[];
  formatarValor: (v: number) => string;
  vazio: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(120, dados.length * 40)}
            role="img"
            aria-label={titulo}
          >
            <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                content={<TooltipConteudo formatarValor={formatarValor} />}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20} maxBarSize={24}>
                {dados.map((_, i) => (
                  <Cell key={i} fill="var(--chart-1)" />
                ))}
                <LabelList
                  dataKey="valor"
                  position="right"
                  formatter={(valor) => formatarValor(Number(valor))}
                  style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
