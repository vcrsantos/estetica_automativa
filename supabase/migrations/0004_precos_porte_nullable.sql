-- POLIBRILHO — permite preço sem porte para serviços que não exigem veículo
-- (ex.: higienização residencial), onde a variação por porte não faz sentido.

alter table precos alter column porte drop not null;

alter table precos drop constraint if exists precos_servico_id_unidade_id_porte_key;

-- Um preço por porte quando o porte é informado...
create unique index precos_servico_unidade_porte_key
  on precos (servico_id, unidade_id, porte)
  where porte is not null;

-- ...e um único preço "sem porte" por serviço/unidade quando não é informado.
create unique index precos_servico_unidade_sem_porte_key
  on precos (servico_id, unidade_id)
  where porte is null;
