"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ItemDonut = { label: string; valor: number };

/**
 * Paleta na família do amarelo (identidade da marca) em vez de cores
 * categóricas genéricas — cada fatia é uma variação de tom/saturação do
 * mesmo amarelo/dourado, do mais claro ao mais escuro. O slot 1 usa
 * var(--chart-1) para acompanhar a cor de destaque do tema; os demais são
 * fixos porque já funcionam nas duas superfícies (claro/escuro) sem
 * precisar mudar por modo. A legenda ao lado de cada fatia (nome + valor)
 * já resolve a distinção, então tons próximos não prejudicam a leitura.
 */
const CORES_DONUT = ["var(--chart-1)", "#E0A100", "#B8860B", "#F5D26B"];

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

const RADIANO = Math.PI / 180;

/** Rótulo de dado dentro da fatia — porcentagem (o valor em R$ já fica logo abaixo, na legenda); fatias muito finas (<6%) ficam sem rótulo pra não sobrepor texto. */
function RotuloFatia({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (percent < 0.06) return null;
  const raio = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + raio * Math.cos(-midAngle * RADIANO);
  const y = cy + raio * Math.sin(-midAngle * RADIANO);
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="#101314">
      {`${Math.round(percent * 100)}%`}
    </text>
  );
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
  mostrarCentro,
  contagemLabel = "serviço",
  naoVendidos,
  fraseUnica,
}: {
  titulo: string;
  /** Máximo de 4 categorias (paleta validada) — agrupe o resto em "Outros" antes de passar aqui. */
  dados: ItemDonut[];
  formatarValor: (v: number) => string;
  vazio: string;
  href?: string;
  hrefLabel?: string;
  /** Mostra valor total + contagem de itens no centro da rosca, em vez de deixar o miolo vazio (seção 4.8 das melhorias — usado no Mix de serviços). */
  mostrarCentro?: boolean;
  /** Singular do que está sendo contado no centro, ex.: "serviço" vira "serviços" no plural. */
  contagemLabel?: string;
  /** Nomes do catálogo ativo que não venderam nada no período — vira uma linha abaixo da legenda em vez de ficar de fora da leitura. */
  naoVendidos?: string[];
  /** Frase explicativa quando só há 1 categoria com valor — "100%" sozinho é tautologia. */
  fraseUnica?: string;
}) {
  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 || total <= 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>
        ) : mostrarCentro ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-5">
              <div
                className="relative size-[118px] shrink-0"
                role="img"
                aria-label={`${titulo}: ${formatarValor(total)} em ${dados.length} ${contagemLabel}${dados.length === 1 ? "" : "s"}, líder ${dados[0].label} com ${formatarPercentual(dados[0].valor, total)}`}
              >
                <PieChart width={118} height={118}>
                  <Pie
                    data={dados}
                    dataKey="valor"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
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
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {formatarValor(total)}
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {dados.length} {contagemLabel}
                    {dados.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                {dados.map((d, i) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-2.5 border-b border-border py-2 text-[12.5px] last:border-b-0"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CORES_DONUT[i % CORES_DONUT.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      {formatarValor(d.valor)}
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                      {formatarPercentual(d.valor, total)}
                    </span>
                  </div>
                ))}
                {naoVendidos && naoVendidos.length > 0 && (
                  <div className="flex items-center gap-2.5 py-2 text-[12.5px]">
                    <span className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground/75">
                      {naoVendidos.slice(0, 3).join(", ")}
                      {naoVendidos.length > 3 ? ` e mais ${naoVendidos.length - 3}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground/75">R$ 0</span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground/75">0%</span>
                  </div>
                )}
              </div>
            </div>

            {fraseUnica && dados.length === 1 && (
              <p className="text-xs text-muted-foreground">{fraseUnica}</p>
            )}
          </div>
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
                  label={RotuloFatia}
                  labelLine={false}
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
