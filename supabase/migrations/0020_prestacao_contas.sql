-- POLIBRILHO — aba Ações › Prestação de contas, portada do protótipo
-- (aba-prestacao-de-contas-especificacao.md) para o schema real do projeto.
--
-- Adaptações deliberadas em relação ao documento original:
--
-- 1. "Serviço" no documento (uma linha com cliente/veículo/valor/status) vira
--    aqui uma OS inteira (ordens_servico) — nosso schema já agrega os itens
--    de uma OS num único valor_total/status_pagamento, então cada OS é a
--    unidade de faturamento da prestação.
-- 2. Ao confirmar pagamento, em vez de o próprio documento "virar" recibo
--    (como no protótipo, que não tinha os dois conceitos separados), esta
--    função chama emitir_recibo() de verdade — reaproveita numeração, PDF e
--    histórico do módulo de recibos em vez de duplicar tudo.
-- 3. Lacunas listadas na seção 13 do documento, corrigidas aqui:
--    - número nunca reaproveitado: contador em tabela (upsert), não deriva
--      do maior número existente;
--    - excluir não apaga histórico: cancelamento vira status, preserva
--      quem cancelou e por quê (mesmo padrão do módulo de recibos);
--    - concorrência: índice único parcial trava uma OS em duas prestações
--      ativas ao mesmo tempo, não só validação em memória;
--    - vencido: campo dedicado, calculado na consulta (data_vencimento <
--      hoje e status = 'aberto'), com badge e filtro na tela.
-- 4. O mecanismo de "revisão de vínculo" (seção 9) resolve um problema do
--    protótipo — reconciliar serviços com clientes por heurística de nome
--    /telefone depois de deduplicação manual. Aqui cliente_id é uma FK
--    desde a criação da OS, então o vínculo nunca fica ambíguo — a seção 9
--    não se aplica e não foi portada.
-- 5. Pagamento parcial de uma prestação (mencionado como lacuna) fica fora
--    desta rodada — não fazia parte do pedido, e mexe no modelo de dados
--    (quanto já foi pago vs. total). Cada prestação continua sendo aberta
--    ou paga integralmente, como no documento original.

create type prestacao_status as enum ('aberto', 'pago', 'cancelado');

-- ---------- contador de numeração PC-AAAAMM-NNN, por unidade e mês ----------
create table prestacao_conta_contador (
  unidade_id    uuid not null references unidades(id),
  ano_mes       text not null,
  ultimo_numero integer not null default 0,
  primary key (unidade_id, ano_mes)
);

create or replace function public.proximo_numero_prestacao(p_unidade uuid, p_ano_mes text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  insert into prestacao_conta_contador (unidade_id, ano_mes, ultimo_numero)
  values (p_unidade, p_ano_mes, 1)
  on conflict (unidade_id, ano_mes)
  do update set ultimo_numero = prestacao_conta_contador.ultimo_numero + 1
  returning ultimo_numero into v_numero;

  return v_numero;
end;
$$;

-- ---------- prestação de contas ----------
create table prestacao_conta (
  id                    uuid primary key default gen_random_uuid(),
  unidade_id            uuid not null references unidades(id),
  ano_mes               text not null,
  sequencial            integer not null,
  numero                text not null,

  cliente_id            uuid not null references clientes(id),
  cliente_nome          text not null,
  telefone              text,
  documento             text,

  data_inicio           date not null,
  data_fim              date not null,
  data_vencimento       date,
  observacoes           text,

  valor_total           numeric(12,2) not null check (valor_total > 0),
  status                prestacao_status not null default 'aberto',

  criado_por            uuid not null references usuarios(id),
  criado_em             timestamptz not null default now(),

  pago_em               timestamptz,
  recibo_id             uuid references recibo(id),

  cancelado_em          timestamptz,
  cancelado_por         uuid references usuarios(id),
  motivo_cancelamento   text,

  constraint prestacao_numero_unico unique (unidade_id, ano_mes, sequencial),
  constraint prestacao_periodo_valido check (data_inicio <= data_fim),
  constraint prestacao_pagamento_completo check (
    (status = 'pago' and pago_em is not null and recibo_id is not null) or (status <> 'pago')
  ),
  constraint prestacao_cancelamento_completo check (
    (status = 'cancelado' and cancelado_em is not null and motivo_cancelamento is not null)
    or (status <> 'cancelado')
  )
);

-- ---------- itens da prestação (snapshot de cada OS incluída) ----------
create table prestacao_conta_item (
  id                uuid primary key default gen_random_uuid(),
  prestacao_id      uuid not null references prestacao_conta(id),
  os_id             uuid not null references ordens_servico(id),
  data              date not null,
  veiculo_descricao text,
  descricao         text not null,
  valor             numeric(12,2) not null,
  ativo             boolean not null default true
);

-- Trava no banco: uma OS nunca fica em duas prestações ativas ao mesmo
-- tempo (mesma lógica do recibo_os_unica_ativa).
create unique index prestacao_conta_item_os_ativo
  on prestacao_conta_item (os_id) where ativo;

-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

-- Gera a prestação: revalida no servidor cada OS informada (mesmo cliente e
-- unidade, concluída, ainda não paga, ainda não faturada), monta o
-- snapshot dos itens e grava o valor_total a partir do banco — nunca
-- confiando no total calculado no client.
create or replace function public.gerar_prestacao_conta(payload jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unidade_id uuid := (payload->>'unidade_id')::uuid;
  v_cliente_id uuid := (payload->>'cliente_id')::uuid;
  v_data_inicio date := (payload->>'data_inicio')::date;
  v_data_fim date := (payload->>'data_fim')::date;
  v_ano_mes text := to_char(now(), 'YYYYMM');
  v_sequencial integer;
  v_numero text;
  v_prestacao_id uuid;
  v_os_id text;
  v_os record;
  v_total numeric(12,2) := 0;
  v_veiculo text;
  v_descricao text;
begin
  if v_unidade_id is null or v_cliente_id is null then
    raise exception 'unidade_id e cliente_id são obrigatórios';
  end if;

  if not (public.is_admin() or v_unidade_id = public.current_unidade_id()) then
    raise exception 'Sem permissão para gerar prestação de contas nesta unidade';
  end if;

  if v_data_inicio is null or v_data_fim is null or v_data_inicio > v_data_fim then
    raise exception 'Período inválido';
  end if;

  if not exists (select 1 from jsonb_array_elements_text(coalesce(payload->'os_ids', '[]'::jsonb))) then
    raise exception 'Selecione ao menos um serviço concluído';
  end if;

  v_sequencial := public.proximo_numero_prestacao(v_unidade_id, v_ano_mes);
  v_numero := 'PC-' || v_ano_mes || '-' || lpad(v_sequencial::text, 3, '0');

  insert into prestacao_conta (
    unidade_id, ano_mes, sequencial, numero, cliente_id, cliente_nome, telefone, documento,
    data_inicio, data_fim, data_vencimento, observacoes, valor_total, criado_por
  ) values (
    v_unidade_id, v_ano_mes, v_sequencial, v_numero, v_cliente_id,
    payload->>'cliente_nome', nullif(payload->>'telefone', ''), nullif(payload->>'documento', ''),
    v_data_inicio, v_data_fim, nullif(payload->>'data_vencimento', '')::date,
    nullif(payload->>'observacoes', ''), 1, auth.uid()
  )
  returning id into v_prestacao_id;

  for v_os_id in select * from jsonb_array_elements_text(coalesce(payload->'os_ids', '[]'::jsonb))
  loop
    select * into v_os from ordens_servico
    where id = v_os_id::uuid
      and unidade_id = v_unidade_id
      and cliente_id = v_cliente_id
      and status in ('finalizado', 'entregue')
      and status_pagamento <> 'pago'
      and entrada_em::date between v_data_inicio and v_data_fim;

    if not found then
      raise exception 'OS % não está elegível para esta prestação (cliente, período ou situação de pagamento)', v_os_id;
    end if;

    if exists (select 1 from prestacao_conta_item where os_id = v_os.id and ativo) then
      raise exception 'OS #% já está incluída em outra prestação em aberto', v_os.numero;
    end if;

    -- Um recibo avulso do tipo sinal/parcial pode estar vinculado a esta OS
    -- sem marcá-la como paga (só quitação faz isso) — sem esta checagem, a
    -- mesma OS poderia ser cobrada duas vezes por módulos diferentes.
    if exists (select 1 from recibo_os where os_id = v_os.id and ativo) then
      raise exception 'OS #% já tem um recibo vinculado', v_os.numero;
    end if;

    select trim(concat_ws(' — ', nullif(v.placa, ''), trim(concat_ws(' ', v.marca, v.modelo))))
      into v_veiculo
    from veiculos v where v.id = v_os.veiculo_id;

    select coalesce(string_agg(oi.descricao, ', ' order by oi.id), 'OS #' || v_os.numero)
      into v_descricao
    from os_itens oi where oi.os_id = v_os.id;

    insert into prestacao_conta_item (prestacao_id, os_id, data, veiculo_descricao, descricao, valor)
    values (v_prestacao_id, v_os.id, v_os.entrada_em::date, v_veiculo, v_descricao, v_os.valor_total);

    v_total := v_total + v_os.valor_total;
  end loop;

  update prestacao_conta set valor_total = v_total where id = v_prestacao_id;

  return json_build_object('id', v_prestacao_id, 'numero', v_numero);
exception
  when unique_violation then
    raise exception 'Uma das OS selecionadas já foi incluída em outra prestação nesse meio tempo';
end;
$$;

-- Confirmar pagamento: marca as OS vinculadas como pagas e emite um recibo
-- de verdade (tipo quitação, origem OS, todas as OS da prestação) usando a
-- mesma emitir_recibo() do módulo de recibos.
create or replace function public.confirmar_pagamento_prestacao(
  p_prestacao uuid,
  p_forma_pagamento text,
  p_data_pagamento date,
  p_valor_extenso text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prestacao record;
  v_config record;
  v_payload jsonb;
  v_itens jsonb := '[]'::jsonb;
  v_os_vinculos jsonb := '[]'::jsonb;
  v_item record;
  v_resultado json;
begin
  select * into v_prestacao from prestacao_conta where id = p_prestacao;

  if not found then
    raise exception 'Prestação de contas não encontrada';
  end if;

  if v_prestacao.status <> 'aberto' then
    raise exception 'Esta prestação não está em aberto';
  end if;

  if not (public.is_admin() or v_prestacao.unidade_id = public.current_unidade_id()) then
    raise exception 'Sem permissão para confirmar pagamento nesta unidade';
  end if;

  select * into v_config from configuracao_emitente where unidade_id = v_prestacao.unidade_id;
  if not found then
    raise exception 'Configure os dados do emitente desta unidade antes de confirmar pagamentos';
  end if;

  update ordens_servico
     set status_pagamento = 'pago', forma_pagamento = p_forma_pagamento::forma_pagamento
   where id in (select os_id from prestacao_conta_item where prestacao_id = p_prestacao and ativo);

  for v_item in select * from prestacao_conta_item where prestacao_id = p_prestacao and ativo order by data
  loop
    v_itens := v_itens || jsonb_build_object(
      'descricao', v_item.descricao,
      'quantidade', 1,
      'valor_unitario', v_item.valor,
      'valor_total', v_item.valor
    );
    v_os_vinculos := v_os_vinculos || jsonb_build_object(
      'os_id', v_item.os_id,
      'valor_considerado', v_item.valor
    );
  end loop;

  v_payload := jsonb_build_object(
    'unidade_id', v_prestacao.unidade_id,
    'serie', v_config.serie,
    'tipo', 'quitacao',
    'origem', 'os',
    'cliente_id', v_prestacao.cliente_id,
    'tomador_nome_exibicao', v_prestacao.cliente_nome,
    'tomador_documento', v_prestacao.documento,
    'tomador_endereco', null,
    'referente_a', 'Prestação de contas ' || v_prestacao.numero,
    'forma_pagamento', p_forma_pagamento,
    'data_pagamento', p_data_pagamento,
    'local_emissao', v_config.endereco_cidade,
    'assinante_nome', v_config.assinante_nome_padrao,
    'observacoes', v_prestacao.observacoes,
    'valor', v_prestacao.valor_total,
    'valor_extenso', p_valor_extenso,
    'itens', v_itens,
    'os_vinculos', v_os_vinculos
  );

  v_resultado := public.emitir_recibo(v_payload);

  update prestacao_conta
     set status = 'pago', pago_em = now(), recibo_id = (v_resultado->>'id')::uuid
   where id = p_prestacao;

  return v_resultado;
end;
$$;

-- Cancelar: só prestação em aberto (paga já virou recibo — cancele o
-- recibo pelo módulo de Recibos). Preserva o registro, libera as OS.
create or replace function public.cancelar_prestacao_conta(p_prestacao uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unidade_id uuid;
begin
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Motivo do cancelamento é obrigatório';
  end if;

  select unidade_id into v_unidade_id from prestacao_conta where id = p_prestacao and status = 'aberto';

  if v_unidade_id is null then
    raise exception 'Prestação inexistente ou não está em aberto';
  end if;

  if not public.is_admin() then
    raise exception 'Apenas administradores podem cancelar uma prestação de contas';
  end if;

  update prestacao_conta
     set status = 'cancelado', cancelado_em = now(), cancelado_por = auth.uid(),
         motivo_cancelamento = p_motivo
   where id = p_prestacao;

  update prestacao_conta_item set ativo = false where prestacao_id = p_prestacao;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table prestacao_conta_contador enable row level security;
alter table prestacao_conta enable row level security;
alter table prestacao_conta_item enable row level security;

create policy prestacao_conta_select on prestacao_conta for select to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());
create policy prestacao_conta_insert on prestacao_conta for insert to authenticated
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
-- Sem update/delete: só as funções security definer acima alteram status.

create policy prestacao_conta_item_select on prestacao_conta_item for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from prestacao_conta p
      where p.id = prestacao_conta_item.prestacao_id and p.unidade_id = public.current_unidade_id()
    )
  );

-- prestacao_conta_contador não tem política: só a função de numeração o toca.
