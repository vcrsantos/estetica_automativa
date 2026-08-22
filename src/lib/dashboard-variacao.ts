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

export type InfoVariacao = { texto: string; tom: "positivo" | "negativo" | "neutro"; indisponivel?: boolean };

/**
 * Nunca esconde o indicador em silêncio (seção 4.2 das melhorias): quando não
 * há base de comparação, mostra uma frase explicando o motivo em vez de
 * omitir a linha inteira ou exibir um "——" sem contexto. `contexto` deixa a
 * frase específica pro card ("mês" no card de Faturamento do mês, "período"
 * nos demais KPIs presos ao seletor de período global).
 */
export function formatarVariacao(
  variacao: Variacao,
  formatarValor: (v: number) => string,
  contexto: string = "período"
): InfoVariacao {
  if (variacao.estado === "sem-dado") {
    return { texto: `Sem ${contexto} anterior para comparar`, tom: "neutro", indisponivel: true };
  }
  if (variacao.estado === "primeiro-registro") {
    return {
      texto: `${contexto.charAt(0).toUpperCase()}${contexto.slice(1)} anterior zerado`,
      tom: "neutro",
      indisponivel: true,
    };
  }
  const sinal = variacao.absoluta >= 0 ? "+" : "";
  return {
    texto: `${sinal}${formatarValor(variacao.absoluta)} (${sinal}${variacao.percentual.toFixed(0)}%)`,
    tom: variacao.absoluta >= 0 ? "positivo" : "negativo",
  };
}
