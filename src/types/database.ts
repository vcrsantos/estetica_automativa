export type PerfilUsuario = "administrador" | "atendente";
export type PorteVeiculo = "pequeno" | "medio" | "grande" | "moto";
export type StatusOs = "agendado" | "em_execucao" | "finalizado" | "entregue" | "cancelado";
export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "a_prazo";
export type StatusPagamento = "pago" | "pendente" | "parcial";
export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
export type TipoFoto = "antes" | "depois";

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
  hoje: DashboardPeriodo;
  ontem: DashboardPeriodo;
  semana: DashboardPeriodo;
  semana_anterior: DashboardPeriodo;
  mes: DashboardPeriodo;
  mes_anterior: DashboardPeriodo;
  em_execucao: number;
  previstos_hoje: number;
  clientes_inativos: number;
  contas_a_receber: number;
};

export type DashboardInsights = {
  evolucao_diaria: { dia: string; faturamento: number; qtd_servicos: number }[];
  top_servicos: { nome: string; qtd: number; faturamento: number }[];
  formas_pagamento: { forma_pagamento: string; qtd: number; faturamento: number }[];
  comparativo_unidades: { unidade_nome: string; faturamento: number; qtd_servicos: number }[];
  top_clientes: { nome: string; total_gasto: number; qtd_servicos: number }[];
  faturamento_por_porte: { porte: string; faturamento: number; qtd_servicos: number }[];
  novos_x_recorrentes: { novos: number; recorrentes: number };
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
  telefone: string;
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
      contatos_reativacao: TableDef<ContatoReativacao>;
      despesas: TableDef<Despesa>;
      log_auditoria: TableDef<LogAuditoria>;
    };
    Views: Record<string, never>;
    Functions: {
      dashboard_resumo: {
        Args: { p_unidade_id: string | null };
        Returns: DashboardResumo;
      };
      clientes_para_reativar: {
        Args: { p_unidade_id: string | null };
        Returns: ClienteParaReativar[];
      };
      dashboard_insights: {
        Args: { p_unidade_id: string | null };
        Returns: DashboardInsights;
      };
      financeiro_resumo: {
        Args: { p_unidade_id: string | null };
        Returns: FinanceiroResumo;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
