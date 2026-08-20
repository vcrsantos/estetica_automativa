export type PeriodoId = "hoje" | "7d" | "30d" | "mes" | "personalizado";

export type PeriodoSelecionado = {
  id: PeriodoId;
  inicio: Date;
  fim: Date;
  /** Texto curto pra compor em frases, ex.: "Faturamento (hoje)". */
  label: string;
};

export const PERIODO_OPCOES: { id: Exclude<PeriodoId, "personalizado">; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "mes", label: "Mês atual" },
];

function inicioDoDia(data: Date) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatarDataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Seletor de período global (seção 3.1 do escopo de melhorias do
 * dashboard) — governa o gráfico combinado, a análise e o KPI de
 * faturamento/ticket médio. A faixa operacional, a taxa de retorno e o
 * resumo hoje/semana/mês de veículos ficam de fora de propósito (regra
 * 1.4: são indicadores "de agora" ou de janelas fixas por natureza).
 */
export function calcularPeriodo(
  id: PeriodoId,
  personalizado?: { inicio: string; fim: string }
): PeriodoSelecionado {
  const agora = new Date();

  switch (id) {
    case "hoje":
      return { id, inicio: inicioDoDia(agora), fim: agora, label: "hoje" };
    case "7d": {
      const inicio = new Date(agora);
      inicio.setDate(inicio.getDate() - 6);
      return { id, inicio: inicioDoDia(inicio), fim: agora, label: "últimos 7 dias" };
    }
    case "30d": {
      const inicio = new Date(agora);
      inicio.setDate(inicio.getDate() - 29);
      return { id, inicio: inicioDoDia(inicio), fim: agora, label: "últimos 30 dias" };
    }
    case "personalizado": {
      if (personalizado?.inicio && personalizado?.fim) {
        const inicio = new Date(`${personalizado.inicio}T00:00:00`);
        const fim = new Date(`${personalizado.fim}T23:59:59`);
        return {
          id,
          inicio,
          fim,
          label: `${formatarDataCurta(inicio)} a ${formatarDataCurta(fim)}`,
        };
      }
      return calcularPeriodo("mes");
    }
    case "mes":
    default:
      return {
        id: "mes",
        inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
        fim: agora,
        label: "este mês",
      };
  }
}
