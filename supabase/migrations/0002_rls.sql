-- POLIBRILHO — Row Level Security por unidade e por perfil (Fase 1)

-- Funções auxiliares (security definer para poder ler a tabela usuarios mesmo
-- com RLS habilitado nela, sem causar recursão nas próprias políticas).
create or replace function public.current_perfil()
returns perfil_usuario
language sql
stable
security definer
set search_path = public
as $$
  select perfil from public.usuarios where id = auth.uid();
$$;

create or replace function public.current_unidade_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from public.usuarios where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_perfil() = 'administrador';
$$;

alter table unidades enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table veiculos enable row level security;
alter table servicos enable row level security;
alter table precos enable row level security;
alter table ordens_servico enable row level security;
alter table os_itens enable row level security;
alter table executores enable row level security;
alter table os_executores enable row level security;
alter table os_fotos enable row level security;
alter table orcamentos enable row level security;
alter table orcamento_itens enable row level security;
alter table contatos_reativacao enable row level security;
alter table despesas enable row level security;
alter table log_auditoria enable row level security;

-- unidades: leitura para qualquer usuário autenticado; escrita só admin.
create policy unidades_select on unidades for select to authenticated using (true);
create policy unidades_write on unidades for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- usuarios: cada usuário vê o próprio registro; admin vê e gerencia todos.
create policy usuarios_select on usuarios for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy usuarios_write on usuarios for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- clientes / veiculos / servicos: catálogo compartilhado entre as duas unidades.
create policy clientes_select on clientes for select to authenticated using (true);
create policy clientes_insert on clientes for insert to authenticated with check (true);
create policy clientes_update on clientes for update to authenticated using (true) with check (true);
create policy clientes_delete on clientes for delete to authenticated using (public.is_admin());

create policy veiculos_select on veiculos for select to authenticated using (true);
create policy veiculos_insert on veiculos for insert to authenticated with check (true);
create policy veiculos_update on veiculos for update to authenticated using (true) with check (true);
create policy veiculos_delete on veiculos for delete to authenticated using (true);

create policy servicos_select on servicos for select to authenticated using (true);
create policy servicos_write on servicos for insert to authenticated with check (public.is_admin());
create policy servicos_update on servicos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- precos: leitura compartilhada; só admin edita a tabela de referência
-- (o valor praticado por OS é outra coisa, editável por qualquer atendente
-- diretamente em os_itens.valor_praticado).
create policy precos_select on precos for select to authenticated using (true);
create policy precos_write on precos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ordens_servico: só a própria unidade (admin vê as duas). Nunca há política
-- de DELETE — cancelamento é sempre via UPDATE de status, preservando histórico.
create policy ordens_servico_select on ordens_servico for select to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());
create policy ordens_servico_insert on ordens_servico for insert to authenticated
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
create policy ordens_servico_update on ordens_servico for update to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id())
  with check (public.is_admin() or unidade_id = public.current_unidade_id());

create policy os_itens_all on os_itens for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_itens.os_id and os.unidade_id = public.current_unidade_id()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_itens.os_id and os.unidade_id = public.current_unidade_id()
    )
  );

create policy os_executores_all on os_executores for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_executores.os_id and os.unidade_id = public.current_unidade_id()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_executores.os_id and os.unidade_id = public.current_unidade_id()
    )
  );

create policy os_fotos_select on os_fotos for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_fotos.os_id and os.unidade_id = public.current_unidade_id()
    )
  );
create policy os_fotos_insert on os_fotos for insert to authenticated
  with check (
    public.is_admin() or exists (
      select 1 from ordens_servico os
      where os.id = os_fotos.os_id and os.unidade_id = public.current_unidade_id()
    )
  );
create policy os_fotos_delete on os_fotos for delete to authenticated
  using (public.is_admin());

-- executores: qualquer atendente da unidade pode cadastrar; alterar
-- comissão/desativar é ação de admin.
create policy executores_select on executores for select to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());
create policy executores_insert on executores for insert to authenticated
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
create policy executores_update on executores for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy executores_delete on executores for delete to authenticated
  using (public.is_admin());

-- orcamentos: mesma lógica de unidade da OS, mas com DELETE liberado
-- (rascunhos podem ser removidos, diferente de uma OS já em atendimento).
create policy orcamentos_select on orcamentos for select to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());
create policy orcamentos_insert on orcamentos for insert to authenticated
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
create policy orcamentos_update on orcamentos for update to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id())
  with check (public.is_admin() or unidade_id = public.current_unidade_id());
create policy orcamentos_delete on orcamentos for delete to authenticated
  using (public.is_admin() or unidade_id = public.current_unidade_id());

create policy orcamento_itens_all on orcamento_itens for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from orcamentos o
      where o.id = orcamento_itens.orcamento_id and o.unidade_id = public.current_unidade_id()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from orcamentos o
      where o.id = orcamento_itens.orcamento_id and o.unidade_id = public.current_unidade_id()
    )
  );

-- contatos_reativacao: clientes são compartilhados entre unidades, então o
-- histórico de contato também é compartilhado (evita reativar 2x o mesmo
-- cliente a partir de unidades diferentes).
create policy contatos_reativacao_select on contatos_reativacao for select to authenticated using (true);
create policy contatos_reativacao_insert on contatos_reativacao for insert to authenticated with check (true);

-- despesas: dado financeiro sensível, restrito a administrador.
create policy despesas_all on despesas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- log_auditoria: qualquer usuário autenticado pode inserir registro da sua
-- própria ação; leitura restrita a administrador; imutável (sem update/delete).
create policy log_auditoria_insert on log_auditoria for insert to authenticated
  with check (usuario_id = auth.uid());
create policy log_auditoria_select on log_auditoria for select to authenticated
  using (public.is_admin());
