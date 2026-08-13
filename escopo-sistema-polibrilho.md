# Escopo — Sistema de Gestão POLIBRILHO

> Documento de escopo para desenvolvimento do sistema interno de gestão da POLIBRILHO (estética automotiva).
> Uso: revisar, ajustar as decisões em aberto (seção 12) e entregar ao Claude Code como briefing do projeto.

---

## 1. Objetivo

Criar um sistema web (acessível pelo celular e pelo computador) para controlar a operação da POLIBRILHO: registro de todos os serviços executados, controle financeiro básico, cadastro de clientes e veículos, emissão e envio de orçamentos, e alerta de clientes inativos para reativação.

**Não é um site institucional nem um app para o cliente final.** É uma ferramenta interna, com login obrigatório.

## 2. Perfis de usuário e permissões

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Administrador** | Os donos | Tudo: todos os relatórios financeiros, cadastro de usuários, tabela de preços, configurações, exclusão de registros, acesso às duas unidades |
| **Atendente** | Um por unidade | Cadastrar clientes, abrir e fechar ordens de serviço, emitir orçamentos, ver relatórios da própria unidade (sem lucro/despesas globais) |

**Definido:** apenas donos e atendentes terão login. Lavadores e técnicos **não acessam o sistema** — são cadastrados como *executores* (nome, unidade, percentual de comissão) e o atendente marca na OS quem executou cada serviço. Assim os relatórios de produtividade e comissão continuam existindo sem exigir celular e treinamento de toda a equipe.

Regras:
- Login obrigatório com e-mail (ou usuário) e senha, com recuperação de senha.
- Cada usuário é vinculado a uma ou mais unidades. Os donos enxergam as duas.
- Registro de auditoria: quem criou, alterou ou cancelou cada ordem de serviço, com data e hora.
- Modelo de permissões preparado para liberar, no futuro, um acesso limitado aos técnicos sem refazer a estrutura.

## 3. Estrutura da empresa (multiunidade)

O sistema nasce com **duas unidades**: Coelho Neto e Duque Bacelar.

- Todo serviço, orçamento e faturamento é vinculado a uma unidade.
- Filtro de unidade em todas as telas e relatórios.
- Administrador enxerga consolidado e por unidade; demais perfis enxergam apenas a sua.
- Estrutura preparada para adicionar uma terceira unidade sem retrabalho.

## 4. Módulo — Clientes e veículos

**Cliente**
- Nome / razão social, telefone com WhatsApp (obrigatório), e-mail, CPF ou CNPJ (opcional), endereço, como conheceu a empresa (Instagram, indicação, passou na frente...), observações.
- Data do primeiro e do último serviço (calculado automaticamente).
- Total gasto no histórico e número de serviços (calculado).
- Etiquetas: cliente comum, frota/empresa, VIP.

**Veículo** (um cliente pode ter vários)
- Placa, marca, modelo, ano, cor.
- **Porte**: pequeno (hatch), médio (sedan), grande (SUV / caminhonete), moto — porque o preço varia por porte.
- Observações do veículo (ex.: pintura sensível, já teve polimento em tal data).

> Importante: o sistema precisa aceitar serviços **sem veículo**, porque a higienização residencial (sofá, colchão, estofado) não tem carro associado.

**Busca**: por nome, telefone ou placa, com resultado instantâneo. Cadastro rápido de cliente direto da tela de nova ordem de serviço (sem precisar sair do fluxo).

## 5. Módulo — Catálogo de serviços e tabela de preços

- Cadastro de serviços com: nome, descrição curta, categoria, duração estimada, se exige veículo (sim/não).
- Preço definido **por porte de veículo** (pequeno / médio / grande / moto) e por unidade, já que os preços podem diferir entre Coelho Neto e Duque Bacelar.
- Pacotes / combos (ex.: lavagem técnica + higienização interna).
- Serviços iniciais a cadastrar: lavagem técnica e detalhada, polimento de pintura, polimento de farol, higienização veicular, higienização residencial.
- Serviço pode ser desativado sem apagar o histórico.

**Definido: a tabela é referência, não regra.** O preço vem preenchido automaticamente na OS e no orçamento, mas o atendente pode alterar o valor de cada item. Sempre que o valor final for diferente da tabela, o sistema guarda os dois (`valor_tabela` e `valor_praticado`) e registra quem alterou. Isso gera um relatório de desconto médio por serviço, por unidade e por atendente. Sem esse controle, negociar caso a caso vira um vazamento de margem que ninguém enxerga no fim do mês.

## 6. Módulo — Ordem de Serviço (OS) — o coração do sistema

Cada atendimento gera uma OS numerada.

**Campos**
- Número sequencial, unidade, data e hora de entrada, previsão de entrega, data e hora de saída.
- Cliente e veículo (ou "sem veículo").
- Itens: um ou mais serviços, cada um com valor unitário (puxado da tabela, mas editável).
- Executor(es) do serviço — selecionados em uma lista, sem necessidade de login próprio.
- Desconto (valor ou percentual) e valor final.
- Forma de pagamento: dinheiro, PIX, débito, crédito (com parcelas), a prazo.
- Status do pagamento: pago / pendente / parcial.
- Observações internas.

**Status da OS**: `Agendado → Em execução → Finalizado → Entregue` (+ `Cancelado`, com motivo obrigatório).

**Lançamento rápido — requisito crítico.** Com 25 a 50 serviços por dia, abrir uma OS não pode passar de 30 segundos. A tela precisa de: busca de cliente por placa ou telefone com resultado imediato, cadastro de cliente novo dentro do próprio fluxo (sem sair da tela), os serviços mais vendidos como botões de atalho e o valor já preenchido pela tabela. Se o lançamento for lento, a equipe deixa de lançar no mesmo dia e todo o restante do sistema perde a confiabilidade.

**Fila do dia.** Tela única com todos os carros da unidade naquele momento, agrupados por status. É a tela que o atendente deixa aberta o dia inteiro — e a que substitui o caderno.

**Recursos importantes para estética automotiva**
- **Fotos antes e depois** anexadas à OS (câmera do celular). Serve de portfólio e de prova.
- **Checklist de entrada**: marcar avarias já existentes (riscos, amassados, itens no interior do veículo) para evitar discussão na entrega.
- Botão "avisar cliente que está pronto" — abre o WhatsApp com mensagem pronta.

## 7. Módulo — Orçamentos

- Criar orçamento selecionando cliente (ou só nome + telefone, sem cadastro completo), veículo/porte e serviços do catálogo.
- Campos: validade (padrão 7 dias, editável), condições de pagamento, observações, desconto.
- **Gerar PDF** com identidade visual da POLIBRILHO: logo, dados e endereço da unidade, número do orçamento, dados do cliente e do veículo, tabela de itens e valores, total, validade, condições, contato.
- **Enviar por WhatsApp**: botão que abre a conversa com o cliente já com a mensagem pronta e o link do orçamento. O cliente abre o PDF pelo link ou recebe o arquivo.
- **Status do orçamento**: rascunho → enviado → aprovado / recusado / expirado.
- **Converter orçamento aprovado em Ordem de Serviço** com um clique (sem redigitar nada).
- Relatório de taxa de conversão: quantos orçamentos viraram serviço.

## 8. Módulo — Dashboard e relatórios

**Dashboard inicial (visão do dono)**
- Faturamento de hoje, da semana, do mês — com comparativo contra o período anterior.
- Quantidade de serviços no período.
- Ticket médio.
- Serviços em execução agora / previstos para hoje.
- Contador de clientes inativos (ver seção 9).
- Contas a receber (serviços não pagos).

**Relatórios com filtro de período e unidade**
1. Faturamento por dia / semana / mês.
2. Serviços mais vendidos (quantidade e receita).
3. Faturamento por porte de veículo.
4. Produtividade por funcionário (nº de serviços e receita gerada).
5. Ranking de clientes por valor gasto.
6. Clientes novos x recorrentes.
7. Formas de pagamento.
8. Comparativo entre unidades.

Todo relatório deve ter **exportação em PDF e Excel/CSV**.

## 9. Módulo — Alertas e reativação de clientes

**Regra principal**: listar automaticamente clientes cujo último serviço tem mais de **15 dias**.

Detalhes:
- O prazo precisa ser **configurável** (15 / 30 / 45 / 60 dias) — e, idealmente, configurável por tipo de serviço, porque quem faz lavagem volta em ~15 dias, mas quem faz polimento volta em ~6 meses. Sugestão: cada serviço tem um campo "intervalo ideal de retorno (dias)" e o alerta usa esse valor.
- Tela "Clientes para reativar" com: nome, telefone, último serviço realizado, há quantos dias, valor médio gasto.
- Botão de **WhatsApp com mensagem pronta e personalizável** ("Oi, {nome}! Faz {dias} dias que o {modelo} não passa aqui na POLIBRILHO...").
- Marcar "contato realizado" com data, para o cliente sair da lista por X dias e não receber cobrança repetida.
- Ordenar por maior valor gasto (priorizar bons clientes).

**Outros alertas úteis**
- Orçamentos enviados sem resposta há mais de 3 dias.
- Serviços entregues com pagamento pendente.
- Aniversário do cliente (se cadastrado) — opcional.

## 10. Módulo — Financeiro básico

- Caixa do dia: total recebido, por forma de pagamento.
- Lançamento de despesas simples (produtos, água, energia, salários) por categoria e unidade.
- Resultado do mês: entradas − saídas.
- Comissão por funcionário: percentual configurável sobre os serviços que ele executou.

## 11. Requisitos técnicos e não funcionais

**Experiência de uso**
- **Mobile-first obrigatório**: a operação vai lançar serviço pelo celular, no pátio. Botões grandes, poucos cliques, formulário curto.
- PWA (instalável na tela inicial do celular, com ícone da POLIBRILHO).
- Interface em português do Brasil, valores em R$, datas em dd/mm/aaaa.
- Identidade visual da POLIBRILHO (fundo escuro, visual limpo e minimalista).

**Técnico — sugestão de stack para o Claude Code**
- Front-end: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
- Back-end e banco: Supabase (PostgreSQL + Auth + Storage para as fotos) com Row Level Security por unidade e por perfil.
- Geração de PDF: `@react-pdf/renderer` ou `pdfmake` (gera no navegador, sem servidor extra).
- WhatsApp: links `https://wa.me/55DDDNUMERO?text=...` (gratuito, abre o app com a mensagem pronta). Envio automático em massa exigiria a API oficial do WhatsApp Cloud — deixar para uma fase futura.
- Gráficos: Recharts.
- Deploy: Vercel.

**Outros**
- Backup automático diário do banco.
- LGPD: os dados de clientes são pessoais — acesso restrito por login, sem compartilhamento externo, e possibilidade de excluir um cliente a pedido dele.
- Nada de exclusão definitiva de OS: usar cancelamento com motivo, preservando o histórico.
- **Volume esperado**: 25 a 50 serviços/dia nas duas unidades — entre 9 e 18 mil ordens de serviço por ano. Portanto: listagens sempre paginadas e com filtro de período; índices no banco em `placa`, `telefone`, `unidade_id` e `entrada_em`; dashboards calculados por consulta agregada no banco, nunca carregando todas as OS no navegador.

## 12. Modelo de dados (tabelas principais)

```
unidades        (id, nome, telefone, endereco, ativo)
usuarios        (id, nome, email, senha_hash, perfil, unidade_id, comissao_percentual, ativo)
clientes        (id, nome, telefone, email, documento, endereco, origem, observacoes,
                 etiqueta, criado_em)
veiculos        (id, cliente_id, placa, marca, modelo, ano, cor, porte, observacoes)
servicos        (id, nome, descricao, categoria, exige_veiculo, duracao_min,
                 intervalo_retorno_dias, ativo)
precos          (id, servico_id, unidade_id, porte, valor)
ordens_servico  (id, numero, unidade_id, cliente_id, veiculo_id, status,
                 entrada_em, saida_em, desconto, valor_total, forma_pagamento,
                 status_pagamento, observacoes, criado_por, criado_em)
os_itens        (id, os_id, servico_id, descricao, valor_tabela, valor_praticado,
                 alterado_por)
executores      (id, nome, unidade_id, comissao_percentual, ativo)  /* sem login */
os_executores   (id, os_id, executor_id)
os_fotos        (id, os_id, url, tipo /* antes | depois */)
orcamentos      (id, numero, unidade_id, cliente_id, veiculo_id, status, validade_em,
                 desconto, valor_total, condicoes, observacoes, criado_por, criado_em)
orcamento_itens (id, orcamento_id, servico_id, descricao, valor)
contatos_reativacao (id, cliente_id, usuario_id, contatado_em, canal, resultado)
despesas        (id, unidade_id, categoria, descricao, valor, data)
log_auditoria   (id, usuario_id, entidade, entidade_id, acao, detalhes, criado_em)
```

## 13. Fases de entrega

**Fase 1 — MVP (o que precisa funcionar primeiro)**
1. Login e perfis de acesso
2. Cadastro de clientes e veículos
3. Catálogo de serviços com preço por porte
4. Ordem de Serviço completa (abrir, executar, finalizar, pagar) + tela "fila do dia"
5. Dashboard com faturamento dia / semana / mês
6. Orçamento com PDF e envio por WhatsApp
7. Alerta de clientes com mais de 15 dias sem serviço

**Fase 2**
- Agenda com visão de dia e semana
- Fotos antes/depois e checklist de avarias
- Relatórios completos com exportação
- Financeiro (despesas, caixa, comissões)

**Fase 3**
- Login limitado para lavadores e técnicos (ver serviços atribuídos, marcar início e conclusão, anexar fotos)
- Programa de fidelidade (a cada X lavagens, uma cortesia)
- Envio automático de mensagens pela API oficial do WhatsApp
- Link público para o cliente acompanhar o serviço
- Integração com pagamento (PIX automático) e emissão de nota

## 14. Decisões em aberto (definir antes de começar)

**Já definido:** login apenas para donos e atendentes (um por unidade); tabela de preços como base editável com registro do valor praticado; volume de 25 a 50 serviços por dia nas duas unidades.

**Ainda em aberto:**

1. O prazo de 15 dias vale para todos os serviços ou deve variar por tipo de serviço? (recomendação: variar — ver seção 9)
2. O PDF do orçamento precisa de CNPJ e endereço fiscal, ou é um documento comercial simples?
3. Vai existir orçamento de higienização residencial (sem veículo)? Precisa de campo de endereço para atendimento externo?
4. Já existe logo em alta resolução e paleta de cores definida para aplicar no sistema e no PDF?
5. Quem pode dar desconto fora da tabela — só os donos, ou o atendente também? Existe um limite?

---

## 15. Prompt sugerido para o Claude Code

> Quero desenvolver um sistema web de gestão para a POLIBRILHO, uma empresa de estética automotiva com duas unidades. O escopo completo está no arquivo `escopo-sistema-polibrilho.md` em anexo.
>
> Comece pela **Fase 1 (MVP)** descrita na seção 13. Use Next.js (App Router) + TypeScript + Tailwind + shadcn/ui no front-end e Supabase (Postgres + Auth + Storage) no back-end, com Row Level Security por unidade e por perfil de usuário.
>
> Antes de escrever código: monte a estrutura de pastas, o schema SQL completo (seção 12) com as migrations do Supabase, e me mostre para aprovação. Depois implemente módulo por módulo, começando por autenticação e cadastro de clientes/veículos.
>
> Prioridades: interface **mobile-first** (a operação usa celular no pátio), português do Brasil, valores em R$, visual escuro e minimalista alinhado à identidade da POLIBRILHO. Sem dependência de serviços pagos na Fase 1 — o envio por WhatsApp deve usar links `wa.me` e o PDF deve ser gerado no próprio navegador.
>
> Pontos que não podem ser simplificados: (1) abrir uma ordem de serviço em até 30 segundos, com busca por placa e cadastro de cliente no mesmo fluxo; (2) o preço da tabela é editável na OS, guardando `valor_tabela` e `valor_praticado`; (3) apenas donos e atendentes têm login, mas todo serviço registra qual executor o realizou.
