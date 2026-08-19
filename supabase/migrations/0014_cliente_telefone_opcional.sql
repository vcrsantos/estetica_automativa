-- Telefone deixa de ser obrigatório no cadastro de cliente. WhatsApp
-- continua sendo o canal preferencial (reativação, orçamento, aviso de OS
-- pronta), mas o cadastro precisa aceitar clientes sem contato registrado.

alter table clientes alter column telefone drop not null;
