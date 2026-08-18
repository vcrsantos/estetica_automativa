-- Ajustes no cadastro de clientes e no catálogo de serviços:
-- remove a etiqueta de cliente, adiciona a cidade e libera a exclusão de
-- serviço (restrita a administrador) para quem ainda não tem histórico
-- vinculado — a própria FK de os_itens/orcamento_itens impede excluir um
-- serviço já usado, preservando o histórico.

alter table clientes add column cidade text;

alter table clientes drop column etiqueta;
drop type etiqueta_cliente;

create policy servicos_delete on servicos for delete to authenticated
  using (public.is_admin());
