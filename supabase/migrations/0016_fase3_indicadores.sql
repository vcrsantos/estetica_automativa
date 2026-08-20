-- POLIBRILHO — Fase 3 do escopo de melhorias do dashboard: meta mensal e
-- capacidade diária por unidade (seção 4.1 e 4.8), e três novos indicadores
-- calculáveis com os dados que já existem hoje — taxa de retorno/intervalo
-- entre visitas (4.4), desconto médio ponderado sobre a tabela (4.6) e
-- receita/clientes por origem (4.10). "if not exists"/"create or replace"
-- deixam o arquivo inteiro seguro de rodar de novo.

alter table unidades add column if not exists meta_mensal numeric(10, 2);
alter table unidades add column if not exists capacidade_dia integer;

create or replace function public.dashboard_insights(p_unidade_id uuid default null)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  v_inicio_mes timestamptz := date_trunc('month', now());
begin
  return json_build_object(
    'evolucao_diaria', (
      select coalesce(json_agg(t order by t.dia), '[]'::json)
      from (
        select
          to_char(d::date, 'YYYY-MM-DD') as dia,
          coalesce(sum(os.valor_total), 0) as faturamento,
          count(os.id) as qtd_servicos
        from generate_series(current_date - interval '13 days', current_date, interval '1 day') d
        left join ordens_servico os
          on os.entrada_em::date = d::date
          and os.status <> 'cancelado'
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by d
      ) t
    ),
    'top_servicos', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select s.nome, count(*) as qtd, sum(oi.valor_praticado) as faturamento
        from os_itens oi
        join ordens_servico os on os.id = oi.os_id
        join servicos s on s.id = oi.servico_id
        where os.status <> 'cancelado'
          and os.entrada_em >= v_inicio_mes
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by s.nome
        order by sum(oi.valor_praticado) desc
        limit 5
      ) t
    ),
    'formas_pagamento', (
      select coalesce(json_agg(t order by t.faturamento desc), '[]'::json)
      from (
        select coalesce(forma_pagamento::text, 'nao_informado') as forma_pagamento,
               count(*) as qtd, sum(valor_total) as faturamento
        from ordens_servico os
        where status <> 'cancelado'
          and entrada_em >= v_inicio_mes
          and (p_unidade_id is null or unidade_id = p_unidade_id)
        group by forma_pagamento
      ) t
    ),
    'comparativo_unidades', (
      select coalesce(json_agg(t order by t.faturamento desc), '[]'::json)
      from (
        select u.nome as unidade_nome,
               coalesce(sum(os.valor_total), 0) as faturamento,
               count(os.id) as qtd_servicos
        from unidades u
        left join ordens_servico os
          on os.unidade_id = u.id
          and os.status <> 'cancelado'
          and os.entrada_em >= v_inicio_mes
        where u.ativo
        group by u.nome
      ) t
    ),
    'top_clientes', (
      select coalesce(json_agg(t), '[]'::json)
      from (
        select c.nome, sum(os.valor_total) as total_gasto, count(os.id) as qtd_servicos
        from ordens_servico os
        join clientes c on c.id = os.cliente_id
        where os.status <> 'cancelado'
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by c.nome
        order by sum(os.valor_total) desc
        limit 5
      ) t
    ),
    'faturamento_por_porte', (
      select coalesce(json_agg(t order by
        case t.porte when 'pequeno' then 1 when 'medio' then 2 when 'grande' then 3 when 'moto' then 4 end
      ), '[]'::json)
      from (
        select v.porte::text as porte, sum(os.valor_total) as faturamento, count(os.id) as qtd_servicos
        from ordens_servico os
        join veiculos v on v.id = os.veiculo_id
        where os.status <> 'cancelado'
          and os.entrada_em >= v_inicio_mes
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by v.porte
      ) t
    ),
    'novos_x_recorrentes', (
      with clientes_mes as (
        select distinct cliente_id
        from ordens_servico
        where status <> 'cancelado'
          and entrada_em >= v_inicio_mes
          and (p_unidade_id is null or unidade_id = p_unidade_id)
      ),
      primeira_visita as (
        select cliente_id, min(entrada_em) as primeira
        from ordens_servico
        where status <> 'cancelado'
        group by cliente_id
      )
      select json_build_object(
        'novos', count(*) filter (where pv.primeira >= v_inicio_mes),
        'recorrentes', count(*) filter (where pv.primeira < v_inicio_mes)
      )
      from clientes_mes cm
      join primeira_visita pv on pv.cliente_id = cm.cliente_id
    ),
    'taxa_retorno', (
      with visitas_90d as (
        select cliente_id, count(*) as qtd
        from ordens_servico
        where status <> 'cancelado'
          and entrada_em >= now() - interval '90 days'
          and (p_unidade_id is null or unidade_id = p_unidade_id)
        group by cliente_id
      ),
      intervalos as (
        select
          entrada_em - lag(entrada_em) over (partition by cliente_id order by entrada_em) as intervalo
        from ordens_servico
        where status <> 'cancelado'
          and (p_unidade_id is null or unidade_id = p_unidade_id)
      )
      select json_build_object(
        'taxa_retorno_90d', case when count(*) filter (where qtd >= 1) = 0 then 0
          else round(100.0 * count(*) filter (where qtd >= 2) / count(*) filter (where qtd >= 1), 1) end,
        'intervalo_medio_dias', (
          select round(avg(extract(epoch from intervalo) / 86400)::numeric, 1)
          from intervalos
          where intervalo is not null
        )
      )
      from visitas_90d
    ),
    'desconto_medio', (
      select json_build_object(
        'percentual', case when coalesce(sum(oi.valor_tabela), 0) = 0 then 0
          else round(100.0 * (sum(oi.valor_tabela) - sum(oi.valor_praticado)) / sum(oi.valor_tabela), 1) end,
        'receita_nao_realizada', coalesce(sum(oi.valor_tabela) - sum(oi.valor_praticado), 0)
      )
      from os_itens oi
      join ordens_servico os on os.id = oi.os_id
      where os.status <> 'cancelado'
        and os.entrada_em >= v_inicio_mes
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    ),
    'por_origem', (
      select coalesce(json_agg(t order by t.receita desc), '[]'::json)
      from (
        select
          coalesce(nullif(trim(c.origem), ''), 'Não informado') as origem,
          count(distinct c.id) as qtd_clientes,
          coalesce(sum(os.valor_total), 0) as receita
        from ordens_servico os
        join clientes c on c.id = os.cliente_id
        where os.status <> 'cancelado'
          and os.entrada_em >= v_inicio_mes
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by coalesce(nullif(trim(c.origem), ''), 'Não informado')
      ) t
    )
  );
end;
$$;

grant execute on function public.dashboard_insights(uuid) to authenticated;
