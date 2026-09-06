# POLIBRILHO — Sistema de gestão

Sistema interno de gestão da POLIBRILHO (estética automotiva). Escopo completo em
[`escopo-sistema-polibrilho.md`](./escopo-sistema-polibrilho.md).

Stack: Next.js 16 (App Router, TypeScript) + Tailwind CSS + shadcn/ui + Supabase
(Postgres + Auth), com Row Level Security por unidade e por perfil de usuário.

## Estado atual

Esta é a primeira etapa da Fase 1 (MVP): projeto, banco de dados, autenticação e o
módulo de Clientes e Veículos. Os próximos módulos (catálogo de preços, Ordem de
Serviço, dashboard, orçamentos, reativação de clientes) entram nas próximas etapas.

## Configuração inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto
Supabase (Project Settings → API):

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — chave publicável (`sb_publishable_...`),
  segura para o navegador.
- `SUPABASE_SECRET_KEY` — chave secreta (`sb_secret_...`), **nunca** exposta ao
  navegador; usada só em scripts administrativos no servidor.

### 3. Rodar as migrations no Supabase

O projeto não está linkado à CLI do Supabase, então as migrations em
`supabase/migrations/` precisam ser aplicadas manualmente:

1. Abra o painel do Supabase → **SQL Editor** → **New query**.
2. Cole e rode, **em ordem numérica**, o conteúdo de cada arquivo em
   `supabase/migrations/` (de `0001_schema.sql` até o mais recente).

Isso cria as tabelas, os enums, os índices, as políticas de RLS e os dados
iniciais (as duas unidades e os serviços do catálogo).

### 4. Criar o primeiro usuário administrador

Desde a migration `0031`, o cadastro é feito pela própria interface — não
existe mais um jeito de inserir direto em `usuarios` (a tabela ganhou uma
trigger que já cria a linha sozinha, com `status = 'pendente'`, assim que
alguém termina o cadastro em `auth.users`). Para o primeiro acesso:

1. Acesse `/cadastro` e crie sua conta normalmente — ela nasce pendente,
   como qualquer outra.
2. Copie o seu **User UID** em Supabase → **Authentication → Users**.
3. No **SQL Editor**, promova essa conta a administrador ativo, vinculado a
   todas as unidades (trocando o UUID):

   ```sql
   update usuarios
      set perfil = 'administrador', status = 'ativo'
    where id = 'COLE-O-UUID-AQUI';

   insert into usuario_unidades (usuario_id, unidade_id)
   select 'COLE-O-UUID-AQUI', id from unidades;
   ```

Os próximos usuários se cadastram em `/cadastro` e ficam em `/aguardando`
até você aprová-los em **Usuários**, no menu do sistema — lá dá pra escolher
o papel (Atendente/Gerente/Administrador) e quais unidades cada um vê.

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse `http://localhost:3000/login`.

## Estrutura de pastas

```
supabase/migrations/   Migrations SQL (schema, RLS, seed)
src/app/(auth)/         Login, recuperação e atualização de senha
src/app/(app)/          Área autenticada (dashboard, clientes)
src/components/         Componentes de UI e de domínio
src/lib/supabase/       Clients Supabase (browser, server, proxy)
src/lib/auth/           Checagem de sessão/perfil (DAL)
src/types/database.ts   Tipos das tabelas
```

## Scripts

- `npm run dev` — ambiente de desenvolvimento.
- `npm run build` — build de produção (roda o type-check do TypeScript).
- `npm run lint` — ESLint
