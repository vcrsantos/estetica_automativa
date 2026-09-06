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
2. Cole e rode, **nesta ordem**, o conteúdo de:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed.sql`

Isso cria as tabelas, os enums, os índices, as políticas de RLS e os dados
iniciais (as duas unidades e os serviços do catálogo).

### 4. Criar o primeiro usuário administrador

O sistema não tem cadastro de usuários pela interface ainda (fica para uma próxima
etapa). Para o primeiro acesso:

1. No painel do Supabase → **Authentication → Users → Add user**, crie um usuário
   com e-mail e senha (marque "Auto Confirm User").
2. Copie o **User UID** gerado.
3. No **SQL Editor**, rode (trocando o UUID e os dados):

   ```sql
   insert into usuarios (id, nome, email, perfil, unidade_id)
   values (
     'COLE-O-UUID-AQUI',
     'Seu nome',
     'seu-email@polibrilho.com.br',
     'administrador',
     null -- administrador enxerga as duas unidades, não precisa de unidade fixa
   );
   ```

   Para um atendente, use `perfil = 'atendente'` e informe o `unidade_id` da
   unidade dele (veja os ids em `select id, nome from unidades;`).

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
