/**
 * Regra de variação percentual do escopo do dashboard (seção 1.3):
 * nunca mostrar "+100%" quando o período anterior é zero — isso não é uma
 * conquista de 100%, é a ausência de uma base de comparação. Sempre
 * acompanha a variação absoluta, porque "+300%" sobre uma base de R$20
 * parece uma conquista que não é.
 */
export type Variacao =
  | { estado: "sem-dado" }
  | { estado: "primeiro-registro" }
  | { estado: "percentual"; absoluta: number; percentual: number };

export function calcularVariacao(atual: number, anterior: number): Variacao {
  if (anterior === 0 && atual === 0) return { estado: "sem-dado" };
  if (anterior === 0) return { estado: "primeiro-registro" };
  const absoluta = atual - anterior;
  return { estado: "percentual", absoluta, percentual: (absoluta / anterior) * 100 };
}

export function formatarVariacao(
  variacao: Variacao,
  formatarValor: (v: number) => string
): { texto: string; tom: "positivo" | "negativo" | "neutro" } | null {
  if (variacao.estado === "sem-dado") return null;
  if (variacao.estado === "primeiro-registro") {
    return { texto: "primeiro registro", tom: "neutro" };
  }
  const sinal = variacao.absoluta >= 0 ? "+" : "";
  return {
    texto: `${sinal}${formatarValor(variacao.absoluta)} (${sinal}${variacao.percentual.toFixed(0)}%)`,
    tom: variacao.absoluta >= 0 ? "positivo" : "negativo",
  };
}
