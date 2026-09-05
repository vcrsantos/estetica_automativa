-- POLIBRILHO — o card "Recebimento em dia" e a faixa "Contas a receber"
-- mostravam valores pendentes diferentes pro mesmo período: o primeiro só
-- contava a fração "vencida" (pendente/parcial cuja prestação passou do
-- vencimento, ou cujo próprio dia de atendimento já passou), enquanto
-- 'contas_a_receber' soma todo pendente/parcial do período, vencido ou
-- não. Dois números de "quanto falta receber" na mesma tela que não
-- batem é confuso e foi reportado como erro.
--
-- Correção: 'valor_recebido_em_dia' passa a ser definido como o
-- complemento exato de 'contas_a_receber' dentro do período — soma direta
-- de tudo com status_pagamento = 'pago'. Como status_pagamento só tem os
-- valores pago/pendente/parcial, `periodo.faturamento - valor_recebido_em_dia`
-- (calculado no frontend) fica sempre idêntico a 'contas_a_receber' do
-- mesmo período, por construção — não tem mais como divergir.
--
-- Mudança aditiva: mesma assinatura de dashboard_resumo(uuid, timestamptz,
-- timestamptz), resto do corpo idêntico ao de
-- 0029_fuso_horario_brasil.sql — só 'valor_recebido_em_dia' fica mais
-- simples.
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
      select coalesce(sum(valor_total), 0) from ordens_servico
      where status_pagamento = 'pago'
        and status <> 'cancelado'
        and entrada_em >= p_inicio and entrada_em < p_fim
        and (p_unidade_id is null or unidade_id = p_unidade_id)
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
