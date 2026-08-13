import type { DashboardInsights, DashboardResumo } from "@/types/database";

export type Insight = {
  tipo: "positivo" | "atencao" | "info";
  texto: string;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Gera observações em português a partir dos números já carregados — nada de nova consulta. */
export function gerarInsights(resumo: DashboardResumo, insights: DashboardInsights): Insight[] {
  const lista: Insight[] = [];

  if (resumo.semana_anterior.faturamento > 0) {
    const variacao =
      ((resumo.semana.faturamento - resumo.semana_anterior.faturamento) /
        resumo.semana_anterior.faturamento) *
      100;
    if (variacao <= -15) {
      lista.push({
        tipo: "atencao",
        texto: `O faturamento desta semana caiu ${Math.abs(variacao).toFixed(0)}% em relação à semana anterior.`,
      });
    } else if (variacao >= 15) {
      lista.push({
        tipo: "positivo",
        texto: `O faturamento desta semana subiu ${variacao.toFixed(0)}% em relação à semana anterior.`,
      });
    }
  }

  if (insights.top_servicos?.length > 0) {
    const top = insights.top_servicos[0];
    lista.push({
      tipo: "info",
      texto: `"${top.nome}" é o serviço que mais rendeu este mês: ${formatarMoeda(top.faturamento)} em ${top.qtd} atendimento${top.qtd === 1 ? "" : "s"}.`,
    });
  }

  if (resumo.clientes_inativos > 0) {
    lista.push({
      tipo: "atencao",
      texto: `${resumo.clientes_inativos} cliente${resumo.clientes_inativos === 1 ? "" : "s"} sem voltar há mais tempo do que o ideal — dá uma olhada na tela de Reativação.`,
    });
  }

  if (resumo.contas_a_receber > 0) {
    lista.push({
      tipo: "atencao",
      texto: `${formatarMoeda(resumo.contas_a_receber)} em pagamentos pendentes — veja quem deve na tela de Contas a Receber.`,
    });
  }

  const { novos, recorrentes } = insights.novos_x_recorrentes ?? { novos: 0, recorrentes: 0 };
  if (novos + recorrentes > 0) {
    const pctRecorrentes = (recorrentes / (novos + recorrentes)) * 100;
    if (pctRecorrentes >= 60) {
      lista.push({
        tipo: "positivo",
        texto: `${pctRecorrentes.toFixed(0)}% dos clientes atendidos este mês já eram clientes fiéis — ótimo sinal de retenção.`,
      });
    } else {
      lista.push({
        tipo: "info",
        texto: `Este mês: ${novos} cliente${novos === 1 ? "" : "s"} novo${novos === 1 ? "" : "s"} e ${recorrentes} recorrente${recorrentes === 1 ? "" : "s"}.`,
      });
    }
  }

  if (resumo.hoje.qtd_servicos > 0 && resumo.mes.qtd_servicos > 0) {
    const ticketHoje = resumo.hoje.faturamento / resumo.hoje.qtd_servicos;
    const ticketMes = resumo.mes.faturamento / resumo.mes.qtd_servicos;
    if (ticketMes > 0 && ticketHoje > ticketMes * 1.2) {
      lista.push({
        tipo: "positivo",
        texto: `O ticket médio de hoje (${formatarMoeda(ticketHoje)}) está acima da média do mês (${formatarMoeda(ticketMes)}).`,
      });
    }
  }

  if (lista.length === 0) {
    lista.push({
      tipo: "info",
      texto: "Ainda não há dados suficientes este mês para gerar recomendações. Volte aqui em alguns dias.",
    });
  }

  return lista.slice(0, 5);
}
