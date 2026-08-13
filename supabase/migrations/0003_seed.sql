-- POLIBRILHO — dados iniciais (Fase 1)

insert into unidades (nome) values
  ('Coelho Neto'),
  ('Duque Bacelar');

-- intervalo_retorno_dias é uma referência inicial para o alerta de reativação
-- (seção 9 do escopo) — ajustável depois na tela de catálogo de serviços.
insert into servicos (nome, categoria, exige_veiculo, intervalo_retorno_dias) values
  ('Lavagem técnica', 'Lavagem', true, 15),
  ('Lavagem detalhada', 'Lavagem', true, 15),
  ('Polimento de pintura', 'Polimento', true, 180),
  ('Polimento de farol', 'Polimento', true, 180),
  ('Higienização veicular', 'Higienização', true, 60),
  ('Higienização residencial', 'Higienização', false, 30);
