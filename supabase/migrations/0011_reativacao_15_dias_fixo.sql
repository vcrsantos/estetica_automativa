-- POLIBRILHO — simplifica a regra de reativação: sempre 15 dias desde o
-- último serviço, para qualquer tipo de serviço (decisão do usuário:
-- mesmo quem fez um polimento pode voltar antes para uma lavagem
-- básica). Substitui o intervalo por tipo de serviço da 0006/0008.

create or replace function public.clientes_para_reativar(p_unidade_id uuid default null)
returns table (
  cliente_id uuid,
  nome text,
  telefone text,
  ultimo_atendimento timestamptz,
  dias_desde_ultimo integer,
  intervalo_dias integer,
  valor_total_gasto numeric,
  veiculo_modelo text,
  veiculo_placa text
)
language sql
stable
set search_path = public
as $$
  with ultima_os as (
    select distinct on (os.cliente_id)
      os.cliente_id,
      os.entrada_em,
      os.veiculo_id
    from ordens_servico os
    where os.status <> 'cancelado'
      and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    order by os.cliente_id, os.entrada_em desc
  ),
  gasto_total as (
    select os.cliente_id, sum(os.valor_total) as total
    from ordens_servico os
    where os.status <> 'cancelado'
      and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    group by os.cliente_id
  ),
  ultimo_contato as (
    select cr.cliente_id, max(cr.contatado_em) as contatado_em
    from contatos_reativacao cr
    group by cr.cliente_id
  )
  select
    c.id as cliente_id,
    c.nome,
    c.telefone,
    uo.entrada_em as ultimo_atendimento,
    extract(day from now() - uo.entrada_em)::integer as dias_desde_ultimo,
    15 as intervalo_dias,
    coalesce(gt.total, 0) as valor_total_gasto,
    v.modelo as veiculo_modelo,
    v.placa as veiculo_placa
  from clientes c
  join ultima_os uo on uo.cliente_id = c.id
  left join gasto_total gt on gt.cliente_id = c.id
  left join veiculos v on v.id = uo.veiculo_id
  left join ultimo_contato uc on uc.cliente_id = c.id
  where now() - uo.entrada_em >= interval '15 days'
    and (uc.contatado_em is null or uc.contatado_em < now() - interval '7 days')
  order by gt.total desc nulls last;
$$;

grant execute on function public.clientes_para_reativar(uuid) to authenticated;
