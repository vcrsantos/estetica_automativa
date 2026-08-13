-- POLIBRILHO — funções agregadas para o dashboard (seção 8 do escopo).
-- Cálculo feito no banco (agregação), nunca carregando as OS no navegador,
-- conforme a seção 11 (volume de 9-18 mil OS/ano). SECURITY INVOKER (padrão):
-- roda com o RLS do usuário chamador, então um atendente só agrega dados da
-- própria unidade mesmo que tente informar outra em p_unidade_id.

create or replace function public._dashboard_periodo(
  p_unidade_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz
)
returns json
language sql
stable
set search_path = public
as $$
  select json_build_object(
    'faturamento', coalesce(sum(valor_total), 0),
    'qtd_servicos', count(*)
  )
  from ordens_servico
  where status <> 'cancelado'
    and entrada_em >= p_inicio
    and entrada_em < p_fim
    and (p_unidade_id is null or unidade_id = p_unidade_id);
$$;

grant execute on function public._dashboard_periodo(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.dashboard_resumo(p_unidade_id uuid default null)
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
begin
  return json_build_object(
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

grant execute on function public.dashboard_resumo(uuid) to authenticated;
