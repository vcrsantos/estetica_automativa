-- POLIBRILHO — módulo de recibos de prestação de serviço (aba Ações › Recibos).
-- Fase 1 (MVP) do escopo enviado: configuração do emitente por unidade,
-- contador de numeração por unidade+série, emissão a partir de OS paga,
-- emissão avulsa, numeração gerada no banco, valor por extenso gravado na
-- emissão, PDF (gerado no client, como já acontece em orçamentos), lista
-- com filtros e cancelamento com motivo obrigatório.
--
-- Recibo NÃO é nota fiscal: nenhuma coluna, política ou tela deste módulo
-- usa a palavra "nota"/"nota fiscal" — o aviso fica no rodapé do PDF.
--
-- Nomes de tabela adaptados ao schema real do projeto (unidades, clientes,
-- ordens_servico, usuarios — não unidade/os/cliente/usuario, como no
-- documento de escopo original).

create type recibo_tipo as enum ('quitacao', 'sinal', 'parcial');
create type recibo_status as enum ('emitido', 'cancelado');

-- ---------- dados do emitente, por unidade ----------
create table configuracao_emitente (
  unidade_id            uuid primary key references unidades(id),
  razao_social          text not null,
  nome_fantasia         text,
  documento             text not null,
  inscricao_municipal   text,
  endereco_logradouro   text not null,
  endereco_numero       text,
  endereco_bairro       text,
  endereco_cidade       text not null,
  endereco_uf           char(2) not null,
  endereco_cep          text,
  telefone              text,
  email                 text,
  logo_url              text,
  assinante_nome_padrao text not null,
  serie                 text not null default 'A',
  atualizado_em         timestamptz not null default now()
);

-- ---------- contador de numeração, por unidade ----------
-- Tabela de contador, não sequence: o nextval de uma sequence não faz
-- rollback (transação falha, número fica perdido e a sequência tem furo
-- inexplicável). O UPDATE ... RETURNING numa tabela reverte junto com a
-- transação.
create table recibo_contador (
  unidade_id    uuid not null references unidades(id),
  serie         text not null default 'A',
  ultimo_numero integer not null default 0,
  primary key (unidade_id, serie)
);

insert into recibo_contador (unidade_id, serie)
select id, 'A' from unidades
on conflict do nothing;

-- Toda unidade nova já nasce com contador de recibos configurado.
create or replace function public.criar_contador_recibo_unidade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into recibo_contador (unidade_id, serie) values (new.id, 'A')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_criar_contador_recibo_unidade on unidades;
create trigger trg_criar_contador_recibo_unidade
after insert on unidades
for each row execute function public.criar_contador_recibo_unidade();

-- ---------- recibo ----------
create table recibo (
  id                    uuid primary key default gen_random_uuid(),
  unidade_id            uuid not null references unidades(id),
  serie                 text not null,
  numero                integer not null,
  tipo                  recibo_tipo not null default 'quitacao',
  origem                text not null check (origem in ('os', 'avulso')),
  status                recibo_status not null default 'emitido',

  valor                 numeric(12,2) not null check (valor > 0),
  valor_extenso         text not null,
  referente_a           text not null,
  forma_pagamento       text not null,
  data_pagamento        date not null,
  data_emissao          timestamptz not null default now(),
  local_emissao         text not null,

  cliente_id            uuid references clientes(id),
  tomador_snapshot      jsonb not null,
  emitente_snapshot     jsonb not null,
  assinante_nome        text not null,

  hash_validacao        text not null unique
                        default encode(gen_random_bytes(16), 'hex'),
  pdf_url               text,
  observacoes           text,

  emitido_por           uuid not null references usuarios(id),
  cancelado_em          timestamptz,
  cancelado_por         uuid references usuarios(id),
  motivo_cancelamento   text,
  recibo_substituto_id  uuid references recibo(id),

  constraint recibo_numero_unico
    unique (unidade_id, serie, numero),

  constraint recibo_cancelamento_completo check (
    (status = 'emitido'  and cancelado_em is null and motivo_cancelamento is null)
    or
    (status = 'cancelado' and cancelado_em is not null and motivo_cancelamento is not null)
  )
);

-- ---------- itens descritos no recibo ----------
create table recibo_item (
  id             uuid primary key default gen_random_uuid(),
  recibo_id      uuid not null references recibo(id),
  ordem          smallint not null,
  descricao      text not null,
  quantidade     numeric(10,2) not null default 1,
  valor_unitario numeric(12,2) not null,
  valor_total    numeric(12,2) not null
);

-- ---------- vínculo com OS (consolidado de frota entra aqui, fase 2) ----------
create table recibo_os (
  recibo_id         uuid not null references recibo(id),
  os_id             uuid not null references ordens_servico(id),
  valor_considerado numeric(12,2) not null,
  ativo             boolean not null default true,
  primary key (recibo_id, os_id)
);

-- Índice parcial: garante no nível do banco que uma OS nunca está em dois
-- recibos ativos ao mesmo tempo (regra 2.4), não só na aplicação.
create unique index recibo_os_unica_ativa
  on recibo_os (os_id) where ativo;

-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

create or replace function public.proximo_numero_recibo(p_unidade uuid, p_serie text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero integer;
begin
  update recibo_contador
     set ultimo_numero = ultimo_numero + 1
   where unidade_id = p_unidade and serie = p_serie
  returning ultimo_numero into v_numero;

  if v_numero is null then
    raise exception 'Contador de recibos não configurado para a unidade %', p_unidade;
  end if;

  return v_numero;
end;
$$;

-- Emissão transacional: valida permissão e saldo, gera o número, monta os
-- snapshots e insere recibo + itens + vínculos de OS numa única transação.
-- O PDF é gerado depois, fora daqui (artefato, não fonte de verdade).
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

  if not (public.is_admin() or v_unidade_id = public.current_unidade_id()) then
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

create or replace function public.cancelar_recibo(p_recibo uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Motivo do cancelamento é obrigatório';
  end if;

  update recibo
     set status = 'cancelado',
         cancelado_em = now(),
         cancelado_por = auth.uid(),
         motivo_cancelamento = p_motivo
   where id = p_recibo and status = 'emitido';

  if not found then
    raise exception 'Recibo inexistente ou já cancelado';
  end if;

  update recibo_os set ativo = false where recibo_id = p_recibo;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table configuracao_emitente enable row level security;
alter table recibo_contador enable row level security;
alter table recibo enable row level security;
alter table recibo_item enable row level security;
alter table recibo_os enable row level security;

create policy configuracao_emitente_select on configuracao_emitente for select to authenticated
  using (true);
create policy configuracao_emitente_write on configuracao_emitente for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy recibo_select on recibo for select to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());
create policy recibo_insert on recibo for insert to authenticated
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
-- Sem política de update/delete: a única forma de alterar um recibo emitido
-- é pelas funções security definer acima (emitir_recibo, cancelar_recibo) —
-- regra de imutabilidade da seção 2.1 do escopo.

create policy recibo_item_select on recibo_item for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from recibo r
      where r.id = recibo_item.recibo_id and r.unidade_id = public.current_unidade_id()
    )
  );

create policy recibo_os_select on recibo_os for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from recibo r
      where r.id = recibo_os.recibo_id and r.unidade_id = public.current_unidade_id()
    )
  );

-- recibo_contador não tem nenhuma política: só as funções security definer
-- acima o tocam, o client nunca lê nem escreve nele diretamente.

-- ---------------------------------------------------------------------
-- Storage — bucket privado (recibo não é público como orçamento; acesso só
-- por URL assinada de curta duração, fase 2).
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recibos', 'recibos', false)
on conflict (id) do nothing;

drop policy if exists "recibos_pdf_insert" on storage.objects;
create policy "recibos_pdf_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'recibos');

drop policy if exists "recibos_pdf_update" on storage.objects;
create policy "recibos_pdf_update" on storage.objects for update to authenticated
  using (bucket_id = 'recibos') with check (bucket_id = 'recibos');

drop policy if exists "recibos_pdf_select" on storage.objects;
create policy "recibos_pdf_select" on storage.objects for select to authenticated
  using (bucket_id = 'recibos');
