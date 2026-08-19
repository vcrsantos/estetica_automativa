"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ItemDonut = { label: string; valor: number };

/**
 * Paleta categórica validada com o script do skill de dataviz (checks de
 * banda de luminosidade, piso de croma, separação CVD e piso de visão
 * normal) — passa em claro e escuro nesta ordem fixa. O slot 1 usa
 * var(--chart-1) para acompanhar a cor de destaque do tema; os demais são
 * fixos porque já validam contra as duas superfícies sem precisar mudar
 * por modo.
 */
const CORES_DONUT = ["var(--chart-1)", "#ff9500", "#42d392", "#ff5a52"];

/** Mantém as `max` maiores categorias e agrupa o resto em "Outros", para caber na paleta validada de 4 cores. */
export function agruparTopCategorias(itens: ItemDonut[], max = 3): ItemDonut[] {
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor);
  if (ordenados.length <= max) return ordenados;

  const top = ordenados.slice(0, max);
  const outros = ordenados.slice(max).reduce((acc, i) => acc + i.valor, 0);
  return outros > 0 ? [...top, { label: "Outros", valor: outros }] : top;
}

function formatarPercentual(valor: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((valor / total) * 100)}%`;
}

function TooltipConteudo({
  active,
  payload,
  total,
  formatarValor,
}: {
  active?: boolean;
  payload?: { payload: ItemDonut }[];
  total: number;
  formatarValor: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{item.label}</p>
      <p className="text-muted-foreground">
        {formatarValor(item.valor)} · {formatarPercentual(item.valor, total)}
      </p>
    </div>
  );
}

export function DonutChart({
  titulo,
  dados,
  formatarValor,
  vazio,
  href,
  hrefLabel = "Ver detalhes",
}: {
  titulo: string;
  /** Máximo de 4 categorias (paleta validada) — agrupe o resto em "Outros" antes de passar aqui. */
  dados: ItemDonut[];
  formatarValor: (v: number) => string;
  vazio: string;
  href?: string;
  hrefLabel?: string;
}) {
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 || total <= 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {dados.map((_, i) => (
                    <Cell key={i} fill={CORES_DONUT[i % CORES_DONUT.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipConteudo total={total} formatarValor={formatarValor} />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex w-full flex-col gap-2">
              {dados.map((d, i) => (
                <div key={d.label} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CORES_DONUT[i % CORES_DONUT.length] }}
                    />
                    <span className="truncate text-foreground">{d.label}</span>
                  </div>
                  <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span className="font-medium text-foreground">{formatarValor(d.valor)}</span>
                    <span className="w-9 text-right text-muted-foreground">
                      {formatarPercentual(d.valor, total)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {href && (
          <Link
            href={href}
            className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {hrefLabel}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
