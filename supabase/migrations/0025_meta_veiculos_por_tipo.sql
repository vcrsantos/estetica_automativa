-- POLIBRILHO — segrega a meta de quantidade de veículos do card "Metas do
-- mês" por tipo: Automóvel (portes pequeno/médio/grande) e Motocicleta
-- (porte 'moto'). `capacidade_dia` (já existente) passa a representar só a
-- capacidade de automóveis por dia; `capacidade_dia_moto` é a coluna nova
-- para motos — nenhum dado existente muda de sentido pra unidades que só
-- atendem carro (capacidade_dia_moto fica null/0, meta de moto some do
-- card, igual já acontece hoje quando capacidade_dia não é configurada).
alter table unidades add column if not exists capacidade_dia_moto integer;

-- Mudança aditiva: mesma assinatura de dashboard_resumo(uuid, timestamptz,
-- timestamptz), só ganha as chaves 'mes_veiculos_automovel' e
-- 'mes_veiculos_moto' no JSON (contagem do mês corrente, mesma janela que
-- já alimenta 'mes'). OS sem veículo vinculado não entra em nenhuma das
-- duas contagens (não dá pra classificar por tipo sem veículo).
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
        and os.entrada_em >= v_inicio_mes and os.entrada_em < v_agora
        and v.porte <> 'moto'
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    ),
    'mes_veiculos_moto', (
      select count(*)
      from ordens_servico os
      join veiculos v on v.id = os.veiculo_id
      where os.status <> 'cancelado'
        and os.entrada_em >= v_inicio_mes and os.entrada_em < v_agora
        and v.porte = 'moto'
        and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    )
  );
end;
$$;

grant execute on function public.dashboard_resumo(uuid, timestamptz, timestamptz) to authenticated;
