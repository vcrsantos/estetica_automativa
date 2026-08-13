-- POLIBRILHO — módulo Financeiro (seção 10 do escopo): caixa do dia, resultado
-- do mês (entradas - saídas), despesas do mês e comissão por executor.
-- SECURITY INVOKER (padrão): a RLS de quem chama continua valendo, então
-- `despesas` só retorna linhas para administrador (política despesas_all) —
-- um atendente que chame esta função simplesmente recebe despesas_mes vazio
-- e saidas_mes zerado, sem precisar de checagem extra aqui dentro.

create or replace function public.financeiro_resumo(p_unidade_id uuid default null)
returns json
language sql
stable
set search_path = public
as $$
  with caixa_rows as (
    select coalesce(forma_pagamento::text, 'nao_informado') as forma_pagamento, valor_total
    from ordens_servico
    where status <> 'cancelado'
      and status_pagamento = 'pago'
      and entrada_em::date = current_date
      and (p_unidade_id is null or unidade_id = p_unidade_id)
  ),
  comissoes as (
    select
      e.id as executor_id,
      e.nome,
      e.comissao_percentual,
      coalesce(sum(os.valor_total), 0) as valor_gerado
    from executores e
    left join os_executores oe on oe.executor_id = e.id
    left join ordens_servico os
      on os.id = oe.os_id
      and os.status <> 'cancelado'
      and os.entrada_em >= date_trunc('month', now())
    where e.ativo
      and (p_unidade_id is null or e.unidade_id = p_unidade_id)
    group by e.id, e.nome, e.comissao_percentual
  )
  select json_build_object(
    'caixa_hoje_total', (select coalesce(sum(valor_total), 0) from caixa_rows),
    'caixa_hoje_por_forma', (
      select coalesce(json_agg(t order by t.valor desc), '[]'::json)
      from (
        select forma_pagamento, sum(valor_total) as valor
        from caixa_rows
        group by forma_pagamento
      ) t
    ),
    'entradas_mes', (
      select coalesce(sum(valor_total), 0)
      from ordens_servico
      where status <> 'cancelado'
        and entrada_em >= date_trunc('month', now())
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'saidas_mes', (
      select coalesce(sum(valor), 0)
      from despesas
      where data >= date_trunc('month', now())::date
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'despesas_mes', (
      select coalesce(json_agg(t order by t.data desc), '[]'::json)
      from (
        select id, categoria, descricao, valor, to_char(data, 'YYYY-MM-DD') as data
        from despesas
        where data >= date_trunc('month', now())::date
          and (p_unidade_id is null or unidade_id = p_unidade_id)
      ) t
    ),
    'comissoes_mes', (
      select coalesce(json_agg(t order by t.comissao desc), '[]'::json)
      from (
        select
          executor_id,
          nome,
          comissao_percentual,
          valor_gerado,
          round(valor_gerado * coalesce(comissao_percentual, 0) / 100, 2) as comissao
        from comissoes
      ) t
    )
  );
$$;

grant execute on function public.financeiro_resumo(uuid) to authenticated;
