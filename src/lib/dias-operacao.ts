/**
 * A Polibrilho atende de segunda a sábado — só domingo não conta como dia de
 * operação pra ritmo/projeção, meta de veículos e o KPI de dias restantes.
 * Não é o conceito genérico de "dia útil" (seg-sex) de templates corporativos.
 */
export function contarDiasOperacao(ano: number, mes: number, ateDia?: number): number {
  const ultimoDia = ateDia ?? new Date(ano, mes + 1, 0).getDate();
  let contador = 0;
  for (let dia = 1; dia <= ultimoDia; dia++) {
    if (new Date(ano, mes, dia).getDay() !== 0) contador++;
  }
  return contador;
}

/**
 * Mês de referência dos cards "Faturamento do mês" e "Metas do mês": o mês
 * de `periodo.fim` (fim do período escolhido no filtro global), não o mês
 * calendário real — pra "Mês atual"/"Hoje"/"7 dias"/"30 dias" isso é o mesmo
 * de sempre, mas um período personalizado num mês passado faz os cards
 * mostrarem aquele mês. `dia` é o "decorrido até" desse mês — o dia de
 * `periodo.fim` quando ele cai dentro do próprio mês de referência (sempre
 * o caso, já que o mês de referência é derivado do próprio `periodo.fim`).
 */
export function mesReferencia(periodo: { fim: Date }) {
  const ano = periodo.fim.getFullYear();
  const mes = periodo.fim.getMonth();
  const dia = periodo.fim.getDate();
  const mesLabel = periodo.fim.toLocaleDateString("pt-BR", { month: "long" });
  return { ano, mes, dia, mesLabel };
}
