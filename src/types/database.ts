export type PerfilUsuario = "administrador" | "atendente";
export type PorteVeiculo = "pequeno" | "medio" | "grande" | "moto";
export type StatusOs = "agendado" | "em_execucao" | "finalizado" | "entregue" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "a_prazo";
export type StatusPagamento = "pago" | "pendente" | "parcial";
export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
export type TipoFoto = "antes" | "depois";
export type ReciboTipo = "quitacao" | "sinal" | "parcial";
export type ReciboStatus = "emitido" | "cancelado";
export type ReciboOrigem = "os" | "avulso";
export type PrestacaoStatus = "aberto" | "pago" | "cancelado";

// Todos os tipos de linha abaixo usam `type` (não `interface`) de propósito:
// `Partial<Interface>` não resolve corretamente dentro da cadeia de tipos
// condicionais do supabase-js, e o `Insert`/`Update` de cada tabela colapsa
// silenciosamente para `never`. Com `type` (object literal), o TypeScript
// expande a estrutura e a checagem funciona.

export type Unidade = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  ativo: boolean;
  criado_em: string;
  /** Meta de faturamento do mês, em R$. Nulo = meta não configurada (some do dashboard). */
  meta_mensal: number | null;
  /** Quantos veículos a unidade comporta por dia. Nulo = ocupação não configurada (some do dashboard). */
  capacidade_dia: number | null;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  unidade_id: string | null;
  comissao_percentual: number | null;
  ativo: boolean;
  criado_em: string;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  endereco: string | null;
  cidade: string | null;
  origem: string | null;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type Veiculo = {
  id: string;
  cliente_id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  porte: PorteVeiculo;
  observacoes: string | null;
  criado_em: string;
};

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  exige_veiculo: boolean;
  duracao_min: number | null;
  intervalo_retorno_dias: number | null;
  ativo: boolean;
  criado_em: string;
};

export type Preco = {
  id: string;
  servico_id: string;
  unidade_id: string;
  porte: PorteVeiculo | null;
  valor: number;
};

export type OrdemServico = {
  id: string;
  numero: number;
  unidade_id: string;
  cliente_id: string;
  veiculo_id: string | null;
  status: StatusOs;
  entrada_em: string;
  previsao_entrega: string | null;
  saida_em: string | null;
  desconto: number;
  valor_total: number;
  forma_pagamento: FormaPagamento | null;
  status_pagamento: StatusPagamento;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type OsItem = {
  id: string;
  os_id: string;
  servico_id: string | null;
  descricao: string;
  valor_tabela: number;
  valor_praticado: number;
  alterado_por: string | null;
};

export type Executor = {
  id: string;
  nome: string;
  unidade_id: string;
  comissao_percentual: number | null;
  ativo: boolean;
  criado_em: string;
};

export type OsExecutor = {
  id: string;
  os_id: string;
  executor_id: string;
};

export type OsFoto = {
  id: string;
  os_id: string;
  url: string;
  tipo: TipoFoto;
  criado_em: string;
};

export type Orcamento = {
  id: string;
  numero: number;
  unidade_id: string;
  cliente_id: string | null;
  veiculo_id: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  porte: PorteVeiculo | null;
  status: StatusOrcamento;
  validade_em: string | null;
  desconto: number;
  valor_total: number;
  condicoes: string | null;
  observacoes: string | null;
  endereco_atendimento: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  servico_id: string | null;
  descricao: string;
  valor: number;
};

export type ConfiguracaoEmitente = {
  unidade_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  documento: string;
  inscricao_municipal: string | null;
  endereco_logradouro: string;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  assinante_nome_padrao: string;
  serie: string;
  atualizado_em: string;
};

export type ReciboTomadorSnapshot = {
  nome_exibicao: string;
  documento: string | null;
  endereco: string | null;
};

export type Recibo = {
  id: string;
  unidade_id: string;
  serie: string;
  numero: number;
  tipo: ReciboTipo;
  origem: ReciboOrigem;
  status: ReciboStatus;
  valor: number;
  valor_extenso: string;
  referente_a: string;
  forma_pagamento: string;
  data_pagamento: string;
  data_emissao: string;
  local_emissao: string;
  cliente_id: string | null;
  tomador_snapshot: ReciboTomadorSnapshot;
  emitente_snapshot: ConfiguracaoEmitente;
  assinante_nome: string;
  hash_validacao: string;
  pdf_url: string | null;
  observacoes: string | null;
  emitido_por: string;
  cancelado_em: string | null;
  cancelado_por: string | null;
  motivo_cancelamento: string | null;
  recibo_substituto_id: string | null;
};

export type ReciboItem = {
  id: string;
  recibo_id: string;
  ordem: number;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type ReciboOs = {
  recibo_id: string;
  os_id: string;
  valor_considerado: number;
  ativo: boolean;
};

export type EmitirReciboItemInput = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type EmitirReciboPayload = {
  unidade_id: string;
  serie: string;
  tipo: ReciboTipo;
  origem: ReciboOrigem;
  cliente_id: string | null;
  tomador_nome_exibicao: string;
  tomador_documento: string | null;
  tomador_endereco: string | null;
  referente_a: string;
  forma_pagamento: string;
  data_pagamento: string;
  local_emissao: string;
  assinante_nome: string;
  observacoes: string | null;
  valor: number;
  valor_extenso: string;
  itens: EmitirReciboItemInput[];
  os_vinculos: { os_id: string; valor_considerado: number }[];
};

export type PrestacaoConta = {
  id: string;
  unidade_id: string;
  ano_mes: string;
  sequencial: number;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  telefone: string | null;
  documento: string | null;
  data_inicio: string;
  data_fim: string;
  data_vencimento: string | null;
  observacoes: string | null;
  valor_total: number;
  status: PrestacaoStatus;
  criado_por: string;
  criado_em: string;
  pago_em: string | null;
  recibo_id: string | null;
  cancelado_em: string | null;
  cancelado_por: string | null;
  motivo_cancelamento: string | null;
};

export type PrestacaoContaItem = {
  id: string;
  prestacao_id: string;
  os_id: string;
  data: string;
  veiculo_nome: string | null;
  veiculo_placa: string | null;
  veiculo_porte: PorteVeiculo | null;
  descricao: string;
  os_observacoes: string | null;
  valor: number;
  ativo: boolean;
};

export type GerarPrestacaoPayload = {
  unidade_id: string;
  cliente_id: string;
  cliente_nome: string;
  telefone: string | null;
  documento: string | null;
  data_inicio: string;
  data_fim: string;
  data_vencimento: string | null;
  observacoes: string | null;
  os_ids: string[];
};

export type ContatoReativacao = {
  id: string;
  cliente_id: string;
  usuario_id: string | null;
  contatado_em: string;
  canal: string | null;
  resultado: string | null;
};

export type Despesa = {
  id: string;
  unidade_id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  data: string;
};

export type LogAuditoria = {
  id: string;
  usuario_id: string | null;
  entidade: string;
  entidade_id: string | null;
  acao: string;
  detalhes: Record<string, unknown> | null;
  criado_em: string;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type DashboardPeriodo = {
  faturamento: number;
  qtd_servicos: number;
};

export type DashboardResumo = {
  /** Período escolhido no seletor global do dashboard (seção 3.1 do escopo de melhorias). */
  periodo: DashboardPeriodo;
  /** Janela de mesma duração imediatamente anterior ao período escolhido. */
  periodo_anterior: DashboardPeriodo;
  hoje: DashboardPeriodo;
  ontem: DashboardPeriodo;
  semana: DashboardPeriodo;
  semana_anterior: DashboardPeriodo;
  mes: DashboardPeriodo;
  mes_anterior: DashboardPeriodo;
  em_execucao: number;
  previstos_hoje: number;
  os_atrasadas: number;
  orcamentos_aguardando: number;
  clientes_inativos: number;
  contas_a_receber: number;
};

export type DashboardInsights = {
  evolucao_diaria: { dia: string; faturamento: number; qtd_servicos: number }[];
  top_servicos: { nome: string; qtd: number; faturamento: number }[];
  formas_pagamento: { forma_pagamento: string; qtd: number; faturamento: number }[];
  comparativo_unidades: {
    unidade_nome: string;
    faturamento: number;
    qtd_servicos: number;
    taxa_retorno_90d: number;
  }[];
  top_clientes: { nome: string; total_gasto: number; qtd_servicos: number }[];
  faturamento_por_porte: { porte: string; faturamento: number; qtd_servicos: number }[];
  novos_x_recorrentes: { novos: number; recorrentes: number };
  taxa_retorno: {
    taxa_retorno_90d: number;
    taxa_retorno_90d_anterior: number;
    intervalo_medio_dias: number | null;
  };
  desconto_medio: { percentual: number; receita_nao_realizada: number };
  por_origem: { origem: string; qtd_clientes: number; receita: number }[];
};

export type FinanceiroResumo = {
  caixa_hoje_total: number;
  caixa_hoje_por_forma: { forma_pagamento: string; valor: number }[];
  entradas_mes: number;
  saidas_mes: number;
  despesas_mes: { id: string; categoria: string; descricao: string | null; valor: number; data: string }[];
  comissoes_mes: {
    executor_id: string;
    nome: string;
    comissao_percentual: number | null;
    valor_gerado: number;
    comissao: number;
  }[];
};

export type ClienteParaReativar = {
  cliente_id: string;
  nome: string;
  telefone: string | null;
  ultimo_atendimento: string;
  dias_desde_ultimo: number;
  intervalo_dias: number;
  valor_total_gasto: number;
  veiculo_modelo: string | null;
  veiculo_placa: string | null;
};

export type Database = {
  public: {
    Tables: {
      unidades: TableDef<Unidade>;
      usuarios: TableDef<Usuario>;
      clientes: TableDef<Cliente>;
      veiculos: TableDef<Veiculo>;
      servicos: TableDef<Servico>;
      precos: TableDef<Preco>;
      ordens_servico: TableDef<OrdemServico>;
      os_itens: TableDef<OsItem>;
      executores: TableDef<Executor>;
      os_executores: TableDef<OsExecutor>;
      os_fotos: TableDef<OsFoto>;
      orcamentos: TableDef<Orcamento>;
      orcamento_itens: TableDef<OrcamentoItem>;
      configuracao_emitente: TableDef<ConfiguracaoEmitente>;
      recibo: TableDef<Recibo>;
      recibo_item: TableDef<ReciboItem>;
      recibo_os: TableDef<ReciboOs>;
      prestacao_conta: TableDef<PrestacaoConta>;
      prestacao_conta_item: TableDef<PrestacaoContaItem>;
      contatos_reativacao: TableDef<ContatoReativacao>;
      despesas: TableDef<Despesa>;
      log_auditoria: TableDef<LogAuditoria>;
    };
    Views: Record<string, never>;
    Functions: {
      dashboard_resumo: {
        Args: { p_unidade_id: string | null; p_inicio?: string; p_fim?: string };
        Returns: DashboardResumo;
      };
      clientes_para_reativar: {
        Args: { p_unidade_id: string | null };
        Returns: ClienteParaReativar[];
      };
      dashboard_insights: {
        Args: { p_unidade_id: string | null; p_inicio?: string; p_fim?: string };
        Returns: DashboardInsights;
      };
      financeiro_resumo: {
        Args: { p_unidade_id: string | null };
        Returns: FinanceiroResumo;
      };
      emitir_recibo: {
        Args: { payload: EmitirReciboPayload };
        Returns: { id: string; numero: number };
      };
      cancelar_recibo: {
        Args: { p_recibo: string; p_motivo: string };
        Returns: null;
      };
      gerar_prestacao_conta: {
        Args: { payload: GerarPrestacaoPayload };
        Returns: { id: string; numero: string };
      };
      confirmar_pagamento_prestacao: {
        Args: {
          p_prestacao: string;
          p_forma_pagamento: string;
          p_data_pagamento: string;
          p_valor_extenso: string;
        };
        Returns: { id: string; numero: number };
      };
      cancelar_prestacao_conta: {
        Args: { p_prestacao: string; p_motivo: string };
        Returns: null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
