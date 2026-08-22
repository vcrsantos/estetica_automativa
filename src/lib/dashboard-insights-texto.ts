import type { DashboardInsights, DashboardResumo } from "@/types/database";

export type Severidade = "critico" | "atencao" | "info";

export type Insight = {
  /** Chave de dedupe — dois insights com o mesmo id só aparecem uma vez. */
  id: string;
  severidade: Severidade;
  /** Curto, com o número dentro. */
  titulo: string;
  /** Uma frase: o "e daí" do título. */
  descricao: string;
  cta?: { label: string; href: string };
  /** Usado para ordenar dentro da mesma severidade (maior primeiro). */
  valor?: number;
};

const PESO_SEVERIDADE: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Contexto opcional de meta do mês (vem de `unidades.meta_mensal`, que
 * `gerarInsights` não tem acesso direto) — quando informado, gera o insight
 * de ritmo necessário pra bater a meta, com a mesma matemática de
 * `MetasDoMesCard` (dias de operação seg–sáb).
 */
export type ContextoMeta = {
  metaMensal: number;
  diasOperacaoTotal: number;
  diasOperacaoDecorridos: number;
  diasOperacaoRestantes: number;
};

/** Gera observações em português a partir dos números já carregados — nada de nova consulta. Deduplicado por `id`, ordenado por severidade e depois por valor (seção 4.3 das melhorias). */
export function gerarInsights(
  resumo: DashboardResumo,
  insights: DashboardInsights,
  contextoMeta?: ContextoMeta
): Insight[] {
  const vistos = new Set<string>();
  const lista: Insight[] = [];

  function adicionar(insight: Insight) {
    if (vistos.has(insight.id)) return;
    vistos.add(insight.id);
    lista.push(insight);
  }

  if (resumo.contas_a_receber > 0) {
    adicionar({
      id: "contas-a-receber",
      severidade: "critico",
      titulo: `${formatarMoeda(resumo.contas_a_receber)} em aberto`,
      descricao: "Pagamentos pendentes de clientes já atendidos — confira quem deve.",
      cta: { label: "Abrir contas a receber", href: "/contas-a-receber" },
      valor: resumo.contas_a_receber,
    });
  }

  if (resumo.os_atrasadas > 0) {
    adicionar({
      id: "os-atrasadas",
      severidade: "critico",
      titulo: `${resumo.os_atrasadas} OS atrasada${resumo.os_atrasadas === 1 ? "" : "s"}`,
      descricao: "Passaram da previsão de entrega e ainda não foram concluídas.",
      cta: { label: "Abrir fila do dia", href: "/fila-do-dia" },
      valor: resumo.os_atrasadas,
    });
  }

  if (contextoMeta && contextoMeta.metaMensal > 0) {
    const { metaMensal, diasOperacaoTotal, diasOperacaoDecorridos, diasOperacaoRestantes } = contextoMeta;
    const percentualMeta = (resumo.mes.faturamento / metaMensal) * 100;
    const percentualMes = diasOperacaoTotal > 0 ? (diasOperacaoDecorridos / diasOperacaoTotal) * 100 : 0;
    const valorRestante = Math.max(0, metaMensal - resumo.mes.faturamento);
    const ritmoNecessario = diasOperacaoRestantes > 0 ? valorRestante / diasOperacaoRestantes : 0;

    if (valorRestante > 0 && percentualMeta < percentualMes) {
      adicionar({
        id: "meta-mes-abaixo",
        severidade: "atencao",
        titulo: `Meta em ${percentualMeta.toFixed(1)}% com ${percentualMes.toFixed(0)}% do mês corrido`,
        descricao:
          diasOperacaoRestantes > 0
            ? `Para fechar o mês na meta, é preciso faturar ${formatarMoeda(ritmoNecessario)} por dia de operação.`
            : "O mês acaba sem dias de operação restantes para recuperar o ritmo.",
        valor: percentualMes - percentualMeta,
      });
    }
  }

  if (resumo.semana_anterior.faturamento > 0) {
    const variacao =
      ((resumo.semana.faturamento - resumo.semana_anterior.faturamento) /
        resumo.semana_anterior.faturamento) *
      100;
    if (variacao <= -15) {
      adicionar({
        id: "faturamento-semana-queda",
        severidade: "atencao",
        titulo: `Faturamento da semana caiu ${Math.abs(variacao).toFixed(0)}%`,
        descricao: `De ${formatarMoeda(resumo.semana_anterior.faturamento)} para ${formatarMoeda(resumo.semana.faturamento)}, na comparação com a semana anterior.`,
        valor: Math.abs(variacao),
      });
    } else if (variacao >= 15) {
      adicionar({
        id: "faturamento-semana-alta",
        severidade: "info",
        titulo: `Faturamento da semana subiu ${variacao.toFixed(0)}%`,
        descricao: `De ${formatarMoeda(resumo.semana_anterior.faturamento)} para ${formatarMoeda(resumo.semana.faturamento)}, na comparação com a semana anterior.`,
        valor: variacao,
      });
    }
  }

  if (resumo.clientes_inativos > 0) {
    adicionar({
      id: "clientes-inativos",
      severidade: "atencao",
      titulo: `${resumo.clientes_inativos} cliente${resumo.clientes_inativos === 1 ? "" : "s"} sem voltar`,
      descricao: "Passaram do intervalo ideal entre visitas — uma oferta de retorno pode trazer de volta.",
      cta: { label: "Abrir reativação de clientes", href: "/reativacao" },
      valor: resumo.clientes_inativos,
    });
  }

  if (insights.top_servicos?.length > 0) {
    const top = insights.top_servicos[0];
    adicionar({
      id: "top-servico",
      severidade: "info",
      titulo: `"${top.nome}" é o serviço que mais rendeu`,
      descricao: `${formatarMoeda(top.faturamento)} em ${top.qtd} atendimento${top.qtd === 1 ? "" : "s"} este mês.`,
      cta: { label: "Ver mix de serviços", href: "/servicos" },
      valor: top.faturamento,
    });
  }

  const { novos, recorrentes } = insights.novos_x_recorrentes ?? { novos: 0, recorrentes: 0 };
  if (novos + recorrentes > 0) {
    const pctRecorrentes = (recorrentes / (novos + recorrentes)) * 100;
    if (pctRecorrentes < 60) {
      adicionar({
        id: "novos-recorrentes-baixo",
        severidade: "info",
        titulo: `${novos} cliente${novos === 1 ? "" : "s"} novo${novos === 1 ? "" : "s"}, ${recorrentes} recorrente${recorrentes === 1 ? "" : "s"}`,
        descricao: "Uma oferta de retorno pode transformar clientes novos em recorrentes.",
        cta: { label: "Criar campanha de reativação", href: "/reativacao" },
        valor: novos,
      });
    }
  }

  if (resumo.hoje.qtd_servicos > 0 && resumo.mes.qtd_servicos > 0) {
    const ticketHoje = resumo.hoje.faturamento / resumo.hoje.qtd_servicos;
    const ticketMes = resumo.mes.faturamento / resumo.mes.qtd_servicos;
    if (ticketMes > 0 && ticketHoje > ticketMes * 1.2) {
      adicionar({
        id: "ticket-hoje-acima-media",
        severidade: "info",
        titulo: `Ticket médio de hoje acima da média do mês`,
        descricao: `${formatarMoeda(ticketHoje)} hoje contra ${formatarMoeda(ticketMes)} de média no mês.`,
        valor: ticketHoje - ticketMes,
      });
    }
  }

  return lista.sort((a, b) => {
    const diffSeveridade = PESO_SEVERIDADE[a.severidade] - PESO_SEVERIDADE[b.severidade];
    if (diffSeveridade !== 0) return diffSeveridade;
    return (b.valor ?? 0) - (a.valor ?? 0);
  });
}
