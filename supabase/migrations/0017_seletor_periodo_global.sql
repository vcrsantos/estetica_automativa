-- POLIBRILHO — seção 3.1 do escopo de melhorias do dashboard: seletor de
-- período global (hoje / 7 dias / 30 dias / mês atual / personalizado)
-- controlando o gráfico combinado, a análise e o KPI de faturamento.
--
-- Mudança aditiva de propósito: os parâmetros p_inicio/p_fim têm default
-- (mês atual até agora), então chamadas antigas sem esses parâmetros
-- continuam funcionando. Os campos hoje/semana/mês que já existiam
-- continuam sendo devolvidos do mesmo jeito — quem usa (cartão de meta,
-- resumo de veículos) não precisa mudar. Só adiciona 'periodo' e
-- 'periodo_anterior', calculados a partir do intervalo escolhido, com o
-- período anterior sendo uma janela de mesma duração imediatamente antes.
-- A faixa operacional (em_execucao, previstos_hoje, os_atrasadas,
-- orcamentos_aguardando, clientes_inativos, contas_a_receber) e a taxa de
-- retorno continuam sempre "agora" — não fazem sentido presos a um
-- período escolhido (regra 1.4 do escopo).

-- create or replace só substitui uma função de MESMA assinatura; como os
-- parâmetros mudaram, sem esses drops as funções antigas (uuid) ficariam
-- penduradas ao lado das novas (uuid, timestamptz, timestamptz) e o
-- PostgREST passaria a recusar a chamada por ambiguidade de overload.
drop function if exists public.dashboard_resumo(uuid);
drop function if exists public.dashboard_insights(uuid);

create or replace function public.dashboard_resumo(
  p_unidade_id uuid default null,
  p_inicio timestamptz default date_trunc('month', now()),
  p_fim timestamptz default now()
)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  v_agora timestamptz := now();
  v_hoje date := current_date;
  v_inicio_semana timestamptz := date_trunc('week', v_agora);
  v_inicio_semana_anterior timestamptz := v_inicio_semana - interval '7 days';
  v_inicio_mes timestamptz := date_trunc('month', v_agora);
  v_inicio_mes_anterior timestamptz := v_inicio_mes - interval '1 month';
  v_duracao interval := p_fim - p_inicio;
begin
  return json_build_object(
    'periodo', public._dashboard_periodo(p_unidade_id, p_inicio, p_fim),
    'periodo_anterior', public._dashboard_periodo(p_unidade_id, p_inicio - v_duracao, p_inicio),
    'hoje', public._dashboard_periodo(p_unidade_id, v_hoje::timestamptz, v_agora),
    'ontem', public._dashboard_periodo(p_unidade_id, (v_hoje - 1)::timestamptz, v_hoje::timestamptz),
    'semana', public._dashboard_periodo(p_unidade_id, v_inicio_semana, v_agora),
    'semana_anterior', public._dashboard_periodo(p_unidade_id, v_inicio_semana_anterior, v_inicio_semana),
    'mes', public._dashboard_periodo(p_unidade_id, v_inicio_mes, v_agora),
    'mes_anterior', public._dashboard_periodo(p_unidade_id, v_inicio_mes_anterior, v_inicio_mes),
    'em_execucao', (
      select count(*) from ordens_servico
      where status = 'em_execucao'
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'previstos_hoje', (
      select count(*) from ordens_servico
      where status not in ('entregue', 'cancelado')
        and previsao_entrega::date = v_hoje
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'os_atrasadas', (
      select count(*) from ordens_servico
      where status not in ('entregue', 'cancelado')
        and previsao_entrega is not null
        and previsao_entrega < v_agora
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'orcamentos_aguardando', (
      select count(*) from orcamentos
      where status = 'enviado'
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'clientes_inativos', (
      select count(*) from (
        select cliente_id, max(entrada_em) as ultimo_atendimento
        from ordens_servico
        where status <> 'cancelado'
          and (p_unidade_id is null or unidade_id = p_unidade_id)
        group by cliente_id
        having max(entrada_em) < v_agora - interval '15 days'
      ) inativos
    ),
    'contas_a_receber', (
      select coalesce(sum(valor_total), 0) from ordens_servico
      where status_pagamento in ('pendente', 'parcial')
        and status <> 'cancelado'
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    )
  );
end;
$$;

grant execute on function public.dashboard_resumo(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.dashboard_insights(
  p_unidade_id uuid default null,
  p_inicio timestamptz default date_trunc('month', now()),
  p_fim timestamptz default now()
)
returns json
language plpgsql
stable
set search_path = public
as $$
begin
  return json_build_object(
    'evolucao_diaria', (
      select coalesce(json_agg(t order by t.dia), '[]'::json)
      from (
        select
          to_char(d::date, 'YYYY-MM-DD') as dia,
          coalesce(sum(os.valor_total), 0) as faturamento,
          count(os.id) as qtd_servicos
        from generate_series(p_inicio::date, p_fim::date, interval '1 day') d
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
          and os.entrada_em >= p_inicio and os.entrada_em < p_fim
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
          and entrada_em >= p_inicio and entrada_em < p_fim
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
          and os.entrada_em >= p_inicio and os.entrada_em < p_fim
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
          and os.entrada_em >= p_inicio and os.entrada_em < p_fim
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by v.porte
      ) t
    ),
    'novos_x_recorrentes', (
      with clientes_periodo as (
        select distinct cliente_id
        from ordens_servico
        where status <> 'cancelado'
          and entrada_em >= p_inicio and entrada_em < p_fim
          and (p_unidade_id is null or unidade_id = p_unidade_id)
      ),
      primeira_visita as (
        select cliente_id, min(entrada_em) as primeira
        from ordens_servico
        where status <> 'cancelado'
        group by cliente_id
      )
      select json_build_object(
        'novos', count(*) filter (where pv.primeira >= p_inicio),
        'recorrentes', count(*) filter (where pv.primeira < p_inicio)
      )
      from clientes_periodo cp
      join primeira_visita pv on pv.cliente_id = cp.cliente_id
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
        and os.entrada_em >= p_inicio and os.entrada_em < p_fim
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
          and os.entrada_em >= p_inicio and os.entrada_em < p_fim
          and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        group by coalesce(nullif(trim(c.origem), ''), 'Não informado')
      ) t
    )
  );
end;
$$;

grant execute on function public.dashboard_insights(uuid, timestamptz, timestamptz) to authenticated;
