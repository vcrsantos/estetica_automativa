-- POLIBRILHO — segunda leva de indicadores do dashboard (seção 8 do
-- escopo): evolução diária, serviços mais vendidos, formas de pagamento
-- e comparativo entre unidades. Agregação no banco, SECURITY INVOKER
-- (respeita o RLS de quem chama).

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
    )
  );
end;
$$;

grant execute on function public.dashboard_insights(uuid) to authenticated;
