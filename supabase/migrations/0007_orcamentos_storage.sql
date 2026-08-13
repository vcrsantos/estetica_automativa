-- POLIBRILHO — suporte a orçamento sem cadastro completo de cliente (seção 7)
-- e armazenamento do PDF gerado para envio por link no WhatsApp.
-- Escrito para ser seguro de rodar mais de uma vez (idempotente).

alter table orcamentos add column if not exists contato_nome text;
alter table orcamentos add column if not exists contato_telefone text;
alter table orcamentos add column if not exists porte porte_veiculo;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orcamentos_cliente_ou_contato_check'
  ) then
    alter table orcamentos add constraint orcamentos_cliente_ou_contato_check
      check (cliente_id is not null or (contato_nome is not null and contato_telefone is not null));
  end if;
end $$;

-- Bucket público: o cliente final abre o link do PDF sem estar logado no
-- sistema, então o objeto precisa ser acessível sem autenticação.
insert into storage.buckets (id, name, public)
values ('orcamentos', 'orcamentos', true)
on conflict (id) do nothing;

drop policy if exists "orcamentos_pdf_insert" on storage.objects;
create policy "orcamentos_pdf_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'orcamentos');

drop policy if exists "orcamentos_pdf_update" on storage.objects;
create policy "orcamentos_pdf_update" on storage.objects for update to authenticated
  using (bucket_id = 'orcamentos') with check (bucket_id = 'orcamentos');

drop policy if exists "orcamentos_pdf_select" on storage.objects;
create policy "orcamentos_pdf_select" on storage.objects for select to public
  using (bucket_id = 'orcamentos');
