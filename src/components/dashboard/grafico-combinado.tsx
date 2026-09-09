"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Maximize2 } from "lucide-react";
import { Bar, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardInsights } from "@/types/database";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  avisoBg: "rgba(249, 196, 0, 0.13)",
  avisoBorder: "rgba(249, 196, 0, 0.22)",
  avisoTexto: "#8A6A00",
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
  avisoBg: "rgba(255, 214, 0, 0.1)",
  avisoBorder: "rgba(255, 214, 0, 0.3)",
  avisoTexto: "#FFD600",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarInteiro(valor: number) {
  return Math.round(valor).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatarDiaCurto(diaIso: string) {
  const [, mes, dia] = diaIso.split("-");
  return `${dia}/${mes}`;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Tick de duas linhas no eixo X: dia em cima, mês abreviado (3 letras) embaixo. */
function TickDiaMes({
  x,
  y,
  payload,
  cor,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string };
  cor: string;
}) {
  if (x == null || y == null || !payload) return null;
  const [, mes, dia] = payload.value.split("-");
  return (
    <g transform={`translate(${Number(x)},${Number(y)})`}>
      <text x={0} y={0} dy={10} textAnchor="middle" fontSize={10} fill={cor}>
        {dia}
      </text>
      <text x={0} y={0} dy={22} textAnchor="middle" fontSize={9} fill={cor}>
        {MESES_ABREV[Number(mes) - 1]}
      </text>
    </g>
  );
}

/** Média móvel de 7 dias — usa quantos dias anteriores estiverem disponíveis quando a janela ainda não está
 * cheia, e ignora dias sem nenhuma atividade dentro da janela (não entram no cálculo, nem no divisor). */
function calcularMediaMovel(dados: PontoDiario[], janela = 7): Ponto[] {
  return dados.map((ponto, i) => {
    const fatia = dados.slice(Math.max(0, i - janela + 1), i + 1).filter((p) => p.faturamento > 0);
    const media = fatia.length > 0 ? fatia.reduce((acc, p) => acc + p.faturamento, 0) / fatia.length : 0;
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
  const ticketMedio = item.qtd_servicos > 0 ? formatarMoeda(item.faturamento / item.qtd_servicos) : "—";
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
        {item.qtd_servicos} veículo{item.qtd_servicos === 1 ? "" : "s"} · ticket médio: {ticketMedio}
      </p>
    </div>
  );
}

function ItemLegenda({
  cor,
  label,
  corTexto,
  tracejado,
  ativo,
  onClick,
}: {
  cor: string;
  label: string;
  corTexto: string;
  tracejado?: boolean;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
      style={{ color: corTexto, opacity: ativo ? 1 : 0.4 }}
    >
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
    </button>
  );
}

type PropsFormaBarra = { x?: number; y?: number; width?: number; height?: number; payload?: Ponto };
type PropsPontoLinha = { cx?: number; cy?: number; payload?: Ponto };
type PropsRotuloUltimoPonto = { x?: number; y?: number; index?: number; value?: number };
type ChaveSerie = "faturamento" | "mediaMovel" | "veiculos";

/** Gráfico combinado (seção 3.4 do escopo original, refinado pela seção 4.5 das melhorias): faturamento em barras, veículos/dia em linha sobre um eixo secundário e média móvel de 7 dias tracejada quando há dados suficientes para significar algo. */
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
  const [seriesOcultas, setSeriesOcultas] = React.useState<Set<ChaveSerie>>(() => new Set());

  function alternarSerie(serie: ChaveSerie) {
    setSeriesOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(serie)) proximo.delete(serie);
      else proximo.add(serie);
      return proximo;
    });
  }

  React.useEffect(() => {
    // next-themes só sabe o tema real depois de ler o localStorage no
    // navegador — até lá, cliente e servidor têm que renderizar o mesmo
    // placeholder, senão a hidratação quebra.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  const escuro = montado && resolvedTheme === "dark";
  const cores = escuro ? PALETA_ESCURA : PALETA_CLARA;

  const diasComVenda = pontos.filter((p) => p.faturamento > 0).length;
  const diasZerados = pontos.length - diasComVenda;
  const mostrarMediaMovel = diasComVenda >= 5;
  const [expandido, setExpandido] = React.useState(false);

  function renderConteudoGrafico(altura: number) {
    return (
      <>
        <ResponsiveContainer
          width="100%"
          height={altura}
          role="img"
          aria-label={`Gráfico de faturamento diário e veículos atendidos, ${titulo}`}
        >
          <ComposedChart data={pontos} margin={{ top: 24, right: 36, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={36}
              tick={(props) => <TickDiaMes {...props} cor={cores.textMuted} />}
            />
            <YAxis yAxisId="faturamento" tickLine={false} axisLine={false} tick={false} width={4} />
            <YAxis
              yAxisId="veiculos"
              orientation="right"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={false}
              width={4}
            />
            <Tooltip cursor={{ fill: cores.grid, opacity: 0.4 }} content={<TooltipConteudo cores={cores} />} />
            <Bar
              yAxisId="faturamento"
              dataKey="faturamento"
              maxBarSize={30}
              hide={seriesOcultas.has("faturamento")}
              shape={(props) => {
                // Em dias sem nenhum lançamento, desenha um traço de 3px na
                // linha de base em vez de altura zero: o dia existe e está
                // vazio, diferente de um espaço em branco ambíguo (seção
                // 4.5 das melhorias).
                const { x = 0, y = 0, width = 0, height = 0, payload } = props as PropsFormaBarra;
                if (payload && payload.faturamento === 0) {
                  return <rect x={x} y={y - 3} width={width} height={3} rx={1.5} fill={cores.grid} />;
                }
                return <rect x={x} y={y} width={width} height={height} rx={3} ry={3} fill={cores.primary} />;
              }}
            >
              <LabelList
                dataKey="faturamento"
                position="top"
                fill={cores.textSecondary}
                fontSize={14}
                fontWeight={700}
                formatter={(valor) => (typeof valor === "number" && valor > 0 ? formatarInteiro(valor) : "")}
              />
            </Bar>
            {mostrarMediaMovel && (
              <Line
                yAxisId="faturamento"
                type="monotone"
                dataKey="mediaMovel"
                stroke={cores.trend}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                hide={seriesOcultas.has("mediaMovel")}
              >
                <LabelList
                  dataKey="mediaMovel"
                  content={(props) => {
                    const { x, y, index, value } = props as PropsRotuloUltimoPonto;
                    if (index !== pontos.length - 1 || x == null || y == null || value == null) return null;
                    return (
                      <text x={x + 6} y={y} dy={4} textAnchor="start" fontSize={16} fontWeight={600} fill={cores.trend}>
                        {formatarInteiro(value)}
                      </text>
                    );
                  }}
                />
              </Line>
            )}
            <Line
              yAxisId="veiculos"
              type="monotone"
              dataKey="qtd_servicos"
              stroke={cores.dataDark}
              strokeWidth={2}
              hide={seriesOcultas.has("veiculos")}
              dot={(props) => {
                // Ponto só aparece em dias com atendimento — em dia zerado
                // sugeriria um dado que não foi coletado (seção 4.5).
                const { cx, cy, payload } = props as PropsPontoLinha;
                if (!payload || payload.qtd_servicos === 0 || cx == null || cy == null) {
                  return null;
                }
                return (
                  <circle
                    key={payload.dia}
                    cx={cx}
                    cy={cy}
                    r={2}
                    fill={cores.primary}
                    stroke={cores.dataDark}
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 3, fill: cores.primary, stroke: cores.dataDark, strokeWidth: 1.5 }}
            >
              <LabelList
                dataKey="qtd_servicos"
                position="top"
                fill={cores.textMuted}
                fontSize={12}
                formatter={(valor) => (typeof valor === "number" && valor > 0 ? formatarInteiro(valor) : "")}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <ItemLegenda
            cor={cores.primary}
            label="Faturamento R$"
            corTexto={cores.textSecondary}
            ativo={!seriesOcultas.has("faturamento")}
            onClick={() => alternarSerie("faturamento")}
          />
          {mostrarMediaMovel && (
            <ItemLegenda
              cor={cores.trend}
              label="Média móvel (7 dias) R$"
              corTexto={cores.textSecondary}
              tracejado
              ativo={!seriesOcultas.has("mediaMovel")}
              onClick={() => alternarSerie("mediaMovel")}
            />
          )}
          <ItemLegenda
            cor={cores.dataDark}
            label="Veículos Qtd"
            corTexto={cores.textSecondary}
            ativo={!seriesOcultas.has("veiculos")}
            onClick={() => alternarSerie("veiculos")}
          />
        </div>

        {diasZerados > 0 && (
          <p
            className="mt-3 rounded-md px-3 py-2 text-xs"
            style={{ background: cores.avisoBg, border: `1px solid ${cores.avisoBorder}`, color: cores.avisoTexto }}
          >
            {diasZerados} de {pontos.length} dias sem faturamento lançado. Confira se as OS estão sendo
            registradas no sistema.
          </p>
        )}
      </>
    );
  }

  return (
    <Card className="rounded-[8px] shadow-none" style={{ background: cores.background }}>
      <CardHeader>
        <CardTitle className="text-sm font-medium" style={{ color: cores.textPrimary }}>
          {titulo}
        </CardTitle>
        <CardAction>
          <button
            type="button"
            onClick={() => setExpandido(true)}
            aria-label="Expandir gráfico"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Maximize2 className="size-4" />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>{renderConteudoGrafico(240)}</CardContent>

      <Dialog open={expandido} onOpenChange={setExpandido}>
        <DialogContent
          className="ring-0 sm:max-w-4xl"
          style={{ background: cores.background, outline: "none" }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: cores.textPrimary }}>{titulo}</DialogTitle>
          </DialogHeader>
          {renderConteudoGrafico(440)}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
