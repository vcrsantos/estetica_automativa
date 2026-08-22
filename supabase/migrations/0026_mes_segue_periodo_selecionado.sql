-- POLIBRILHO — os cards "Faturamento do mês" e "Metas do mês" passam a
-- referenciar o mês do período selecionado no filtro global, em vez de
-- ficarem travados no mês-calendário real (`now()`) independente do que o
-- usuário escolheu no seletor. O "mês de referência" é o mês de `p_fim`
-- (fim do período escolhido): pra "Mês atual"/"Hoje"/"7 dias"/"30 dias",
-- isso continua sendo o mês corrente de sempre (sem mudança visível); pra
-- um período personalizado num mês passado, os dois cards passam a mostrar
-- aquele mês, com "decorrido" calculado até o dia de `p_fim` — se o
-- período personalizado cobre o mês inteiro, o mês aparece 100% decorrido.
--
-- Só `mes`/`mes_anterior` e as contagens de veículos por tipo mudam de
-- base. Os indicadores "de agora" (em_execucao, previstos_hoje,
-- os_atrasadas, clientes_inativos, contas_a_receber, hoje/ontem/semana)
-- continuam usando `now()`/`current_date` de verdade — não fazem sentido
-- presos a um período escolhido (regra 1.4 do escopo original).
--
-- Mudança aditiva: mesma assinatura de dashboard_resumo(uuid, timestamptz,
-- timestamptz).
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
