-- POLIBRILHO — causa raiz do "32 dias" no aviso do histórico de
-- faturamento: o projeto no Supabase roda com o timezone de sessão padrão
-- (UTC), então todo `::date`/`date_trunc`/`current_date` feito dentro das
-- funções do dashboard interpreta os timestamps em UTC, não no horário de
-- Brasília (UTC-3) que a Polibrilho usa de verdade. Um período
-- personalizado até 31/08 23:59:59 no horário local vira 01/09 02:59:59 em
-- UTC — ao cair num `::date`, esse instante já é "01/09", e o
-- generate_series do histórico diário passa a incluir um dia a mais (32
-- em vez de 31). O mesmo problema afeta silenciosamente qualquer OS
-- lançada à noite (pode cair no dia seguinte no gráfico/no "mês").
--
-- Correção na raiz: as duas funções passam a fixar
-- `set timezone = 'America/Sao_Paulo'` na própria definição (escopo local
-- à função, não muda o timezone de mais nada no banco) — todo `::date` e
-- `date_trunc` dentro delas passa a usar o dia-calendário certo, do
-- horário de Brasília. Mudança aditiva: mesma assinatura das duas
-- funções, resto do corpo idêntico ao de
-- 0028_contas_a_receber_por_periodo.sql (dashboard_resumo) e
-- 0027_ranking_clientes_por_periodo.sql (dashboard_insights).
create or replace function public.dashboard_resumo(
  p_unidade_id uuid default null,
  p_inicio timestamptz default date_trunc('month', now()),
  p_fim timestamptz default now()
)
returns json
language plpgsql
stable
set search_path = public
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_agora timestamptz := now();
  v_hoje date := current_date;
  v_inicio_semana timestamptz := date_trunc('week', v_agora);
  v_inicio_semana_anterior timestamptz := v_inicio_semana - interval '7 days';
  v_duracao interval := p_fim - p_inicio;
  v_mes_ref timestamptz := date_trunc('month', p_fim);
  v_fim_mes_ref timestamptz := least(p_fim, v_mes_ref + interval '1 month');
  v_mes_ref_anterior timestamptz := v_mes_ref - interval '1 month';
begin
  return json_build_object(
    'periodo', public._dashboard_periodo(p_unidade_id, p_inicio, p_fim),
    'periodo_anterior', public._dashboard_periodo(p_unidade_id, p_inicio - v_duracao, p_inicio),
    'hoje', public._dashboard_periodo(p_unidade_id, v_hoje::timestamptz, v_agora),
    'ontem', public._dashboard_periodo(p_unidade_id, (v_hoje - 1)::timestamptz, v_hoje::timestamptz),
    'semana', public._dashboard_periodo(p_unidade_id, v_inicio_semana, v_agora),
    'semana_anterior', public._dashboard_periodo(p_unidade_id, v_inicio_semana_anterior, v_inicio_semana),
    'mes', public._dashboard_periodo(p_unidade_id, v_mes_ref, v_fim_mes_ref),
    'mes_anterior', public._dashboard_periodo(p_unidade_id, v_mes_ref_anterior, v_mes_ref),
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
        and entrada_em >= p_inicio and entrada_em < p_fim
        and (p_unidade_id is null or unidade_id = p_unidade_id)
    ),
    'valor_recebido_em_dia', (
      select coalesce(sum(os.valor_total), 0)
      from ordens_servico os
      where os.status <> 'cancelado'
        and os.entrada_em >= p_inicio and os.entrada_em < p_fim
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
        and not (
          os.status_pagamento in ('pendente', 'parcial')
          and exists (
            select 1
            from prestacao_conta_item pci
            join prestacao_conta pc on pc.id = pci.prestacao_id
            where pci.os_id = os.id
              and pci.ativo
              and pc.status = 'aberto'
              and pc.data_vencimento is not null
              and pc.data_vencimento < v_hoje
          )
        )
        and not (
          os.status_pagamento in ('pendente', 'parcial')
          and os.entrada_em::date < v_hoje
          and not exists (
            select 1 from prestacao_conta_item pci
            where pci.os_id = os.id and pci.ativo
          )
        )
    ),
    'mes_veiculos_automovel', (
      select count(*)
      from ordens_servico os
      join veiculos v on v.id = os.veiculo_id
      where os.status <> 'cancelado'
        and os.entrada_em >= v_mes_ref and os.entrada_em < v_fim_mes_ref
        and v.porte <> 'moto'
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    ),
    'mes_veiculos_moto', (
      select count(*)
      from ordens_servico os
      join veiculos v on v.id = os.veiculo_id
      where os.status <> 'cancelado'
        and os.entrada_em >= v_mes_ref and os.entrada_em < v_fim_mes_ref
        and v.porte = 'moto'
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
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
set timezone = 'America/Sao_Paulo'
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
          and os.entrada_em >= p_inicio and os.entrada_em < p_fim
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
        'clientes_base', count(*) filter (where qtd >= 1),
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
