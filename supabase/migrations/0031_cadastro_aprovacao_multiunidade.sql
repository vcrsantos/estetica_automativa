-- POLIBRILHO — Fase 1 do cadastro com aprovação: autocadastro público,
-- fila de pendentes, e usuário podendo enxergar mais de uma unidade.
--
-- Antes disso o sistema só tinha 2 papéis (administrador/atendente), 1
-- unidade fixa por usuário, e nenhum jeito de se cadastrar pela interface —
-- toda conta era criada manualmente no painel do Supabase. Esta migration:
--
-- 1) troca `usuarios.ativo` (boolean) por `usuarios.status`
--    ('pendente'|'ativo'|'inativo'), com backfill dos usuários existentes
--    antes de remover a coluna antiga;
-- 2) adiciona o papel 'gerente' ao enum `perfil_usuario` (o papel
--    'administrador' continua sendo o mesmo "master" do escopo de acessos —
--    não foi renomeado, só o app decide onde mostrar rótulos diferentes);
-- 3) substitui `usuarios.unidade_id` (1 unidade fixa) pela tabela
--    `usuario_unidades` (N:N), com backfill 1:1 antes de remover a coluna;
-- 4) cria `log_acessos` para auditar as mudanças que o administrador fizer
--    no acesso de alguém;
-- 5) cria a trigger que insere a linha pendente em `usuarios` assim que
--    alguém termina o autocadastro em auth.users;
-- 6) cria a trava que impede remover/inativar o último administrador ativo;
-- 7) reescreve as políticas de RLS que comparavam `unidade_id =
--    current_unidade_id()` (1 unidade) para usar `tem_acesso_unidade(uuid)`
--    (N unidades) — só as tabelas que realmente dependem da unidade do
--    usuário logado (ordens_servico, orçamentos, executores e filhos);
--    servicos/precos/despesas/unidades (admin-only) e
--    clientes/veiculos/contatos_reativacao (compartilhados) não mudam.
--    O mesmo vale para recibo/recibo_item/recibo_os e
--    prestacao_conta/prestacao_conta_item (0019/0020), que também comparam
--    com current_unidade_id() nas próprias policies e dentro das funções
--    emitir_recibo, gerar_prestacao_conta e confirmar_pagamento_prestacao —
--    ao remover a função no passo 5, essas duas telas quebrariam se não
--    fossem corrigidas aqui também.
--
-- Fora do escopo desta migration (fica para uma Fase 2): permissões
-- granulares por aba (coluna `permissoes` jsonb, `pode(aba, nivel)`) — os
-- únicos dois lugares que hoje diferenciam 'gerente' de 'atendente'
-- (Financeiro em modo leitura, e a ação de Prestação de contas) são
-- resolvidos direto no código do app, sem precisar de coluna nova aqui.

-- 1) status no lugar de ativo -------------------------------------------
alter table usuarios add column status text;
update usuarios set status = case when ativo then 'ativo' else 'inativo' end;
alter table usuarios alter column status set not null;
alter table usuarios add constraint usuarios_status_check
  check (status in ('pendente', 'ativo', 'inativo'));
alter table usuarios alter column status set default 'pendente';
alter table usuarios drop column ativo;

alter table usuarios add column telefone text;

-- 2) novo papel -----------------------------------------------------------
alter type perfil_usuario add value 'gerente';

-- 3) multi-unidade ---------------------------------------------------------
create table usuario_unidades (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  unidade_id uuid not null references unidades (id) on delete cascade,
  primary key (usuario_id, unidade_id)
);

-- Administrador sempre enxergou as duas unidades na prática (a tela sempre
-- ignorou o valor de unidade_id pra quem é administrador — ver
-- app-shell.tsx antes desta fase), então ele agora fica vinculado a todas,
-- independente do que unidade_id guardava. Os demais mantêm só a unidade
-- que já tinham.
insert into usuario_unidades (usuario_id, unidade_id)
select u.id, un.id
from usuarios u
cross join unidades un
where u.perfil = 'administrador';

insert into usuario_unidades (usuario_id, unidade_id)
select id, unidade_id
from usuarios
where unidade_id is not null and perfil <> 'administrador';

alter table usuarios drop column unidade_id;

-- 4) auditoria --------------------------------------------------------------
create table log_acessos (
  id bigserial primary key,
  alvo_id uuid not null references usuarios (id) on delete cascade,
  autor_id uuid not null references usuarios (id),
  acao text not null,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);

alter table usuario_unidades enable row level security;
alter table log_acessos enable row level security;

create policy usuario_unidades_select on usuario_unidades for select to authenticated
  using (usuario_id = auth.uid() or public.is_admin());
create policy usuario_unidades_write on usuario_unidades for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy log_acessos_insert on log_acessos for insert to authenticated
  with check (public.is_admin() and autor_id = auth.uid());
create policy log_acessos_select on log_acessos for select to authenticated
  using (public.is_admin());

-- 5) funções auxiliares -----------------------------------------------------
-- is_admin() passa a exigir status = 'ativo' também (antes só olhava o
-- perfil — uma conta de administrador inativada continuava sendo aceita
-- pelas policies de RLS mesmo com o app bloqueando o login dela).
create or replace function public.usuario_esta_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from usuarios where id = auth.uid() and status = 'ativo');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.usuario_esta_ativo() and public.current_perfil() = 'administrador';
$$;

create or replace function public.tem_acesso_unidade(u uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.usuario_esta_ativo() and exists (
    select 1 from usuario_unidades where usuario_id = auth.uid() and unidade_id = u
  );
$$;

-- current_unidade_id() só é removida no fim do arquivo (seção 11): enquanto
-- as políticas/funções antigas de ordens_servico, orçamentos, recibos e
-- prestação de contas ainda não foram substituídas (seções 8/9/10, mais
-- abaixo), elas continuam referenciando essa função — RLS policies geram
-- dependência real no catálogo (diferente de uma chamada dentro de um corpo
-- plpgsql), então tentar remover a função antes disso falha com "other
-- objects depend on it".

-- 6) trigger de autocadastro --------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, telefone, perfil, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    new.raw_user_meta_data->>'telefone',
    'atendente',
    'pendente'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7) trava do último administrador ---------------------------------------
create or replace function public.trava_ultimo_administrador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outros_admins_ativos integer;
begin
  if OLD.perfil = 'administrador' and OLD.status = 'ativo'
     and (NEW.perfil <> 'administrador' or NEW.status <> 'ativo') then
    select count(*) into v_outros_admins_ativos
    from usuarios
    where perfil = 'administrador' and status = 'ativo' and id <> OLD.id;

    if v_outros_admins_ativos = 0 then
      raise exception 'Não é possível remover ou inativar o único administrador ativo do sistema.';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_trava_ultimo_administrador
  before update on usuarios
  for each row execute function public.trava_ultimo_administrador();

-- 8) RLS: 1 unidade fixa -> N unidades por usuário ------------------------
drop policy if exists ordens_servico_select on ordens_servico;
create policy ordens_servico_select on ordens_servico for select to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists ordens_servico_insert on ordens_servico;
create policy ordens_servico_insert on ordens_servico for insert to authenticated
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists ordens_servico_update on ordens_servico;
create policy ordens_servico_update on ordens_servico for update to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id))
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists os_itens_all on os_itens;
create policy os_itens_all on os_itens for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_itens.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_itens.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  );

drop policy if exists os_executores_all on os_executores;
create policy os_executores_all on os_executores for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_executores.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_executores.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  );

drop policy if exists os_fotos_select on os_fotos;
create policy os_fotos_select on os_fotos for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_fotos.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  );

drop policy if exists os_fotos_insert on os_fotos;
create policy os_fotos_insert on os_fotos for insert to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_fotos.os_id and public.tem_acesso_unidade(os.unidade_id)
    )
  );

drop policy if exists executores_select on executores;
create policy executores_select on executores for select to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists executores_insert on executores;
create policy executores_insert on executores for insert to authenticated
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists orcamentos_select on orcamentos;
create policy orcamentos_select on orcamentos for select to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists orcamentos_insert on orcamentos;
create policy orcamentos_insert on orcamentos for insert to authenticated
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists orcamentos_update on orcamentos;
create policy orcamentos_update on orcamentos for update to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id))
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists orcamentos_delete on orcamentos;
create policy orcamentos_delete on orcamentos for delete to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists orcamento_itens_all on orcamento_itens;
create policy orcamento_itens_all on orcamento_itens for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from orcamentos o
      where o.id = orcamento_itens.orcamento_id and public.tem_acesso_unidade(o.unidade_id)
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from orcamentos o
      where o.id = orcamento_itens.orcamento_id and public.tem_acesso_unidade(o.unidade_id)
    )
  );

-- 9) recibos ----------------------------------------------------------------
drop policy if exists recibo_select on recibo;
create policy recibo_select on recibo for select to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists recibo_insert on recibo;
create policy recibo_insert on recibo for insert to authenticated
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists recibo_item_select on recibo_item;
create policy recibo_item_select on recibo_item for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from recibo r
      where r.id = recibo_item.recibo_id and public.tem_acesso_unidade(r.unidade_id)
    )
  );

drop policy if exists recibo_os_select on recibo_os;
create policy recibo_os_select on recibo_os for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from recibo r
      where r.id = recibo_os.recibo_id and public.tem_acesso_unidade(r.unidade_id)
    )
  );

-- create or replace só troca a checagem de unidade (linha marcada abaixo) —
-- corpo idêntico ao de 0019_recibos.sql, é a versão vigente da função.
create or replace function public.emitir_recibo(payload jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unidade_id uuid := (payload->>'unidade_id')::uuid;
  v_serie text := coalesce(payload->>'serie', 'A');
  v_tipo recibo_tipo := (payload->>'tipo')::recibo_tipo;
  v_origem text := payload->>'origem';
  v_numero integer;
  v_recibo_id uuid;
  v_emitente jsonb;
  v_tomador jsonb;
  v_item jsonb;
  v_vinculo jsonb;
  v_ordem smallint := 0;
  v_soma_os numeric(12,2) := 0;
  v_os record;
begin
  if v_unidade_id is null then
    raise exception 'unidade_id é obrigatório';
  end if;

  if not (public.is_admin() or public.tem_acesso_unidade(v_unidade_id)) then -- alterado
    raise exception 'Sem permissão para emitir recibo nesta unidade';
  end if;

  if v_origem not in ('os', 'avulso') then
    raise exception 'Origem inválida';
  end if;

  select to_jsonb(ce) into v_emitente
  from configuracao_emitente ce
  where ce.unidade_id = v_unidade_id;

  if v_emitente is null then
    raise exception 'Configure os dados do emitente desta unidade antes de emitir recibos';
  end if;

  v_tomador := jsonb_build_object(
    'nome_exibicao', payload->>'tomador_nome_exibicao',
    'documento', payload->>'tomador_documento',
    'endereco', payload->>'tomador_endereco'
  );

  if v_origem = 'os' then
    for v_vinculo in select * from jsonb_array_elements(coalesce(payload->'os_vinculos', '[]'::jsonb))
    loop
      select * into v_os from ordens_servico
      where id = (v_vinculo->>'os_id')::uuid
        and unidade_id = v_unidade_id;

      if not found then
        raise exception 'OS % não encontrada nesta unidade', v_vinculo->>'os_id';
      end if;

      if exists (select 1 from recibo_os where os_id = v_os.id and ativo) then
        raise exception 'OS #% já está vinculada a um recibo ativo', v_os.numero;
      end if;

      if v_tipo = 'quitacao' and v_os.status_pagamento <> 'pago' then
        raise exception 'OS #% ainda não está com o pagamento quitado', v_os.numero;
      end if;

      v_soma_os := v_soma_os + (v_vinculo->>'valor_considerado')::numeric;
    end loop;

    if v_tipo in ('sinal', 'parcial') and (payload->>'valor')::numeric > v_soma_os then
      raise exception 'O valor do recibo não pode superar o valor considerado das OS vinculadas';
    end if;
  end if;

  v_numero := public.proximo_numero_recibo(v_unidade_id, v_serie);

  insert into recibo (
    unidade_id, serie, numero, tipo, origem, valor, valor_extenso, referente_a,
    forma_pagamento, data_pagamento, local_emissao, cliente_id, tomador_snapshot,
    emitente_snapshot, assinante_nome, observacoes, emitido_por
  ) values (
    v_unidade_id, v_serie, v_numero, v_tipo, v_origem,
    (payload->>'valor')::numeric, payload->>'valor_extenso', payload->>'referente_a',
    payload->>'forma_pagamento', (payload->>'data_pagamento')::date, payload->>'local_emissao',
    nullif(payload->>'cliente_id', '')::uuid, v_tomador, v_emitente,
    payload->>'assinante_nome', nullif(payload->>'observacoes', ''), auth.uid()
  )
  returning id into v_recibo_id;

  for v_item in select * from jsonb_array_elements(coalesce(payload->'itens', '[]'::jsonb))
  loop
    v_ordem := v_ordem + 1;
    insert into recibo_item (recibo_id, ordem, descricao, quantidade, valor_unitario, valor_total)
    values (
      v_recibo_id, v_ordem, v_item->>'descricao',
      (v_item->>'quantidade')::numeric, (v_item->>'valor_unitario')::numeric,
      (v_item->>'valor_total')::numeric
    );
  end loop;

  if v_origem = 'os' then
    for v_vinculo in select * from jsonb_array_elements(coalesce(payload->'os_vinculos', '[]'::jsonb))
    loop
      insert into recibo_os (recibo_id, os_id, valor_considerado)
      values (v_recibo_id, (v_vinculo->>'os_id')::uuid, (v_vinculo->>'valor_considerado')::numeric);
    end loop;
  end if;

  return json_build_object('id', v_recibo_id, 'numero', v_numero);
exception
  when unique_violation then
    raise exception 'Uma das OS selecionadas já foi vinculada a outro recibo nesse meio tempo';
end;
$$;

-- 10) prestação de contas ----------------------------------------------------
drop policy if exists prestacao_conta_select on prestacao_conta;
create policy prestacao_conta_select on prestacao_conta for select to authenticated
  using (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists prestacao_conta_insert on prestacao_conta;
create policy prestacao_conta_insert on prestacao_conta for insert to authenticated
  with check (public.is_admin() or public.tem_acesso_unidade(unidade_id));

drop policy if exists prestacao_conta_item_select on prestacao_conta_item;
create policy prestacao_conta_item_select on prestacao_conta_item for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from prestacao_conta p
      where p.id = prestacao_conta_item.prestacao_id and public.tem_acesso_unidade(p.unidade_id)
    )
  );

-- create or replace só troca a checagem de unidade (linha marcada abaixo) —
-- corpo idêntico ao de 0022_prestacao_item_campos_estruturados.sql, que é a
-- versão vigente (a assinatura não mudou desde 0020, só o corpo).
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

  if not (public.is_admin() or public.tem_acesso_unidade(v_unidade_id)) then -- alterado
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

-- create or replace só troca a checagem de unidade (linha marcada abaixo) —
-- corpo idêntico ao de 0020_prestacao_contas.sql, é a versão vigente.
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

  if not (public.is_admin() or public.tem_acesso_unidade(v_prestacao.unidade_id)) then -- alterado
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

-- 11) agora sim, current_unidade_id() não tem mais nada dependendo dela.
drop function if exists public.current_unidade_id();
