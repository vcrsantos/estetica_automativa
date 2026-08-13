-- POLIBRILHO — alerta de reativação de clientes (seção 9 do escopo).
-- O prazo usa o intervalo_retorno_dias do(s) serviço(s) da última OS do
-- cliente (o mais exigente entre eles); quando nenhum serviço tem intervalo
-- definido, cai no padrão de 15 dias (regra principal da seção 9).
-- Clientes já contatados nos últimos 7 dias saem da lista para não receber
-- cobrança repetida. SECURITY INVOKER: respeita o RLS do usuário chamador.

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
      os.veiculo_id,
      os.id as os_id
    from ordens_servico os
    where os.status <> 'cancelado'
      and (p_unidade_id is null or os.unidade_id = p_unidade_id)
    order by os.cliente_id, os.entrada_em desc
  ),
  intervalo_por_cliente as (
    select
      uo.cliente_id,
      uo.entrada_em,
      uo.veiculo_id,
      coalesce(min(s.intervalo_retorno_dias), 15) as intervalo_dias
    from ultima_os uo
    left join os_itens oi on oi.os_id = uo.os_id
    left join servicos s on s.id = oi.servico_id
    group by uo.cliente_id, uo.entrada_em, uo.veiculo_id
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
    ip.entrada_em as ultimo_atendimento,
    extract(day from now() - ip.entrada_em)::integer as dias_desde_ultimo,
    ip.intervalo_dias,
    coalesce(gt.total, 0) as valor_total_gasto,
    v.modelo as veiculo_modelo,
    v.placa as veiculo_placa
  from clientes c
  join intervalo_por_cliente ip on ip.cliente_id = c.id
  left join gasto_total gt on gt.cliente_id = c.id
  left join veiculos v on v.id = ip.veiculo_id
  left join ultimo_contato uc on uc.cliente_id = c.id
  where now() - ip.entrada_em >= (ip.intervalo_dias || ' days')::interval
    and (uc.contatado_em is null or uc.contatado_em < now() - interval '7 days')
  order by gt.total desc nulls last;
$$;

grant execute on function public.clientes_para_reativar(uuid) to authenticated;
