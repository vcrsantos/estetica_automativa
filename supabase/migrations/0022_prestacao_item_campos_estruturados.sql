-- POLIBRILHO — prestação de contas: quebra o snapshot de veículo (que
-- antes vinha como uma única string "placa — marca modelo") em campos
-- estruturados, e adiciona a observação da OS — necessário pro novo layout
-- do detalhe (colunas Veículo/Serviço com nome em negrito + linha
-- secundária cinza abaixo, uma pra placa/porte e outra pra observação).
--
-- alter table ... add column if not exists é seguro de rodar mais de uma
-- vez. veiculo_descricao sai porque as prestações criadas até agora são só
-- teste — nada depende dela.

alter table prestacao_conta_item add column if not exists veiculo_nome text;
alter table prestacao_conta_item add column if not exists veiculo_placa text;
alter table prestacao_conta_item add column if not exists veiculo_porte porte_veiculo;
alter table prestacao_conta_item add column if not exists os_observacoes text;
alter table prestacao_conta_item drop column if exists veiculo_descricao;

-- create or replace function só substitui porque a assinatura não mudou —
-- nenhum drop function é necessário aqui.
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
  v_veiculo record;
  v_total numeric(12,2) := 0;
  v_veiculo_nome text;
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
    raise exception 'Selecione ao menos um serviço';
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
      and entrada_em::date between v_data_inicio and v_data_fim;

    if not found then
      raise exception 'OS % não pertence a este cliente/unidade ou está fora do período informado', v_os_id;
    end if;

    if exists (select 1 from prestacao_conta_item where os_id = v_os.id and ativo) then
      raise exception 'OS #% já está incluída em outra prestação em aberto', v_os.numero;
    end if;

    if exists (select 1 from recibo_os where os_id = v_os.id and ativo) then
      raise exception 'OS #% já tem um recibo vinculado', v_os.numero;
    end if;

    select v.* into v_veiculo from veiculos v where v.id = v_os.veiculo_id;
    v_veiculo_nome := nullif(trim(concat_ws(' ', v_veiculo.marca, v_veiculo.modelo)), '');

    select coalesce(string_agg(oi.descricao, ', ' order by oi.id), 'OS #' || v_os.numero)
      into v_descricao
    from os_itens oi where oi.os_id = v_os.id;

    insert into prestacao_conta_item (
      prestacao_id, os_id, data, veiculo_nome, veiculo_placa, veiculo_porte,
      descricao, os_observacoes, valor
    )
    values (
      v_prestacao_id, v_os.id, v_os.entrada_em::date, v_veiculo_nome, v_veiculo.placa, v_veiculo.porte,
      v_descricao, v_os.observacoes, v_os.valor_total
    );

    v_total := v_total + v_os.valor_total;
  end loop;

  update prestacao_conta set valor_total = v_total where id = v_prestacao_id;

  return json_build_object('id', v_prestacao_id, 'numero', v_numero);
exception
  when unique_violation then
    raise exception 'Uma das OS selecionadas já foi incluída em outra prestação nesse meio tempo';
end;
$$;
