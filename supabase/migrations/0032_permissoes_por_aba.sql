-- POLIBRILHO — Fase 2 do cadastro com aprovação: permissões granulares por
-- aba (nenhum/ver/editar), escolhidas pelo administrador na tela Usuários.
--
-- Adiciona `usuarios.permissoes` (jsonb, chave = slug da aba em
-- src/lib/abas.ts, valor = 'nenhum' | 'ver' | 'editar'; chave ausente conta
-- como 'nenhum' — uma aba nova nasce fechada pra todo mundo). Administrador
-- sempre tem acesso completo a tudo, independente do que estiver em
-- `permissoes` — a coluna só é consultada pra gerente/atendente.
--
-- A função `pode(aba, nivel)` fica disponível pra uso futuro em RLS (não
-- reescrevemos as policies de escrita das ~16 tabelas operacionais nesta
-- migration — isso é um esforço grande e arriscado à parte, documentado
-- como pendência). O que esta migration garante de verdade é a Camada 2
-- (guarda de rota, em cada page.tsx via exigirPermissao) e a Camada 3
-- (esconder botões de criar/editar na interface) — a mesma dupla de
-- camadas que a Fase 1 já usou pra Financeiro/Prestação de contas.

alter table usuarios add column permissoes jsonb not null default '{}'::jsonb;

create or replace function public.pode(aba text, nivel text default 'ver')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.usuario_esta_ativo() then false
    when public.current_perfil() = 'administrador' then true
    when nivel = 'editar' then
      (select permissoes->>aba from usuarios where id = auth.uid()) = 'editar'
    else
      (select permissoes->>aba from usuarios where id = auth.uid()) in ('ver', 'editar')
  end;
$$;
