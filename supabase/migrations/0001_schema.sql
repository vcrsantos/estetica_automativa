-- POLIBRILHO — schema inicial (Fase 1)
-- Baseado na seção 12 do escopo, com pequenos acréscimos documentados no plano de implementação:
-- usuarios.id referencia auth.users; ordens_servico ganha previsao_entrega e motivo_cancelamento;
-- orcamentos ganha endereco_atendimento (higienização residencial sem veículo).

create extension if not exists pgcrypto;

create type perfil_usuario as enum ('administrador', 'atendente');
create type porte_veiculo as enum ('pequeno', 'medio', 'grande', 'moto');
create type status_os as enum ('agendado', 'em_execucao', 'finalizado', 'entregue', 'cancelado');
create type forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'credito', 'a_prazo');
create type status_pagamento as enum ('pago', 'pendente', 'parcial');
create type status_orcamento as enum ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado');
create type tipo_foto as enum ('antes', 'depois');
create type etiqueta_cliente as enum ('comum', 'frota', 'vip');

create table unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  endereco text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Vinculada ao auth.users do Supabase: a senha é gerenciada pelo Supabase Auth,
-- não existe coluna de senha aqui.
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil perfil_usuario not null,
  unidade_id uuid references unidades (id),
  comissao_percentual numeric(5, 2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  documento text,
  endereco text,
  origem text,
  observacoes text,
  etiqueta etiqueta_cliente not null default 'comum',
  criado_por uuid references usuarios (id),
  criado_em timestamptz not null default now()
);

create table veiculos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  placa text,
  marca text,
  modelo text,
  ano integer,
  cor text,
  porte porte_veiculo not null,
  observacoes text,
  criado_em timestamptz not null default now()
);

create table servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  categoria text,
  exige_veiculo boolean not null default true,
  duracao_min integer,
  intervalo_retorno_dias integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table precos (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid not null references servicos (id) on delete cascade,
  unidade_id uuid not null references unidades (id) on delete cascade,
  porte porte_veiculo not null,
  valor numeric(10, 2) not null,
  unique (servico_id, unidade_id, porte)
);

create table ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  unidade_id uuid not null references unidades (id),
  cliente_id uuid not null references clientes (id),
  veiculo_id uuid references veiculos (id),
  status status_os not null default 'agendado',
  entrada_em timestamptz not null default now(),
  previsao_entrega timestamptz,
  saida_em timestamptz,
  desconto numeric(10, 2) not null default 0,
  valor_total numeric(10, 2) not null default 0,
  forma_pagamento forma_pagamento,
  status_pagamento status_pagamento not null default 'pendente',
  observacoes text,
  motivo_cancelamento text,
  criado_por uuid references usuarios (id),
  criado_em timestamptz not null default now()
);

create table os_itens (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico (id) on delete cascade,
  servico_id uuid references servicos (id),
  descricao text not null,
  valor_tabela numeric(10, 2) not null,
  valor_praticado numeric(10, 2) not null,
  alterado_por uuid references usuarios (id)
);

create table executores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_id uuid not null references unidades (id),
  comissao_percentual numeric(5, 2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table os_executores (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico (id) on delete cascade,
  executor_id uuid not null references executores (id)
);

create table os_fotos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references ordens_servico (id) on delete cascade,
  url text not null,
  tipo tipo_foto not null,
  criado_em timestamptz not null default now()
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  unidade_id uuid not null references unidades (id),
  cliente_id uuid references clientes (id),
  veiculo_id uuid references veiculos (id),
  status status_orcamento not null default 'rascunho',
  validade_em date,
  desconto numeric(10, 2) not null default 0,
  valor_total numeric(10, 2) not null default 0,
  condicoes text,
  observacoes text,
  endereco_atendimento text,
  criado_por uuid references usuarios (id),
  criado_em timestamptz not null default now()
);

create table orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos (id) on delete cascade,
  servico_id uuid references servicos (id),
  descricao text not null,
  valor numeric(10, 2) not null
);

create table contatos_reativacao (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  usuario_id uuid references usuarios (id),
  contatado_em timestamptz not null default now(),
  canal text,
  resultado text
);

create table despesas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references unidades (id),
  categoria text not null,
  descricao text,
  valor numeric(10, 2) not null,
  data date not null default current_date
);

create table log_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id),
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

-- Índices exigidos pela seção 11 (volume de 9-18 mil OS/ano nas duas unidades)
create index idx_veiculos_placa on veiculos (placa);
create index idx_veiculos_cliente_id on veiculos (cliente_id);
create index idx_clientes_telefone on clientes (telefone);
create index idx_clientes_nome on clientes (nome);
create index idx_ordens_servico_unidade_id on ordens_servico (unidade_id);
create index idx_ordens_servico_entrada_em on ordens_servico (entrada_em);
create index idx_ordens_servico_cliente_id on ordens_servico (cliente_id);
create index idx_ordens_servico_status on ordens_servico (status);
create index idx_orcamentos_unidade_id on orcamentos (unidade_id);
create index idx_orcamentos_status on orcamentos (status);
