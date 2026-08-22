# Dashboard Polibrilho — documentação do estado atual

Levantamento do dashboard tal como está implementado hoje em
`src/components/dashboard/dashboard-content.tsx` e nos componentes que ele
usa. Serve como referência pra manter consistência em novos cards/gráficos
ou pra passar pra um designer revisar.

---

## 1. Visão geral

- Página única (`/`), client component, recarrega os dados sempre que a
  **unidade selecionada** (seletor global no topo do site) ou o **período**
  (seletor logo abaixo do cabeçalho do dashboard) mudam.
- Duas fontes de dados via RPC do Supabase: `dashboard_resumo` e
  `dashboard_insights`, ambas recebendo `p_unidade_id`, `p_inicio`, `p_fim`.
- Regime de faturamento: usa `entrada_em` (data de abertura da OS) como
  referência, não `saida_em` — decisão tomada porque nem toda OS é marcada
  como "entregue" de forma confiável. Aviso disso aparece no rodapé da
  página: *"Data de abertura da OS como referência para faturamento."*
- Tema: claro/escuro via `next-themes`, padrão escuro (`defaultTheme="dark"`
  em `src/app/layout.tsx`). A maioria dos cards usa os tokens do tema
  (`src/app/globals.css`); alguns têm **paleta própria fechada** (ver seção 4).

---

## 2. Estrutura da página, de cima pra baixo

```
Cabeçalho: "Olá, {nome}" + botão "Nova OS" (gradient)
Seletor de período (Hoje / 7 dias / 30 dias / Mês atual / Personalizado)

┌─ Linha de KPIs (grid 5 colunas em telas grandes) ──────────────┐
│ Faturamento do mês (fixo, sempre "este mês") — cartão amarelo  │
│ Faturamento (período selecionado)                               │
│ Veículos atendidos (período)                                    │
│ Ticket médio (período)                                          │
│ Taxa de retorno (90 dias, janela fixa)                          │
└──────────────────────────────────────────────────────────────┘

Faixa de insights (ticker horizontal com rolagem automática)

Faixa operacional "OPERAÇÃO AGORA" (em execução, previsão hoje,
OS atrasadas, orçamentos aguardando, clientes inativos, contas a receber)

Histórico de faturamento (período) — gráfico combinado, largura total

┌─ Linha (grid 3 colunas) ───────────────────────────────────────┐
│ Metas de {mês}          │ Comparativo entre  │ Mix de serviços  │
│ (sempre mês atual)      │ unidades (período) │ (período)        │
└──────────────────────────────────────────────────────────────┘

"Ação e histórico" (título de seção)
┌─ grid 2 colunas ──────────────┐
│ Fila de ação │ Atividade recente │
└───────────────────────────────┘

"Mais indicadores" (título de seção)
┌─ grid 2 colunas ────────────────────────────────────────────┐
│ Resumo de veículos (hoje/semana/mês + ocupação)               │
│ Desconto médio sobre a tabela (período)                       │
│ Clientes e receita por origem (período)                       │
│ Faturamento por porte (período)                               │
│ Formas de pagamento (período) — com link "Ver detalhamento"   │
│ Ranking de clientes por valor gasto (histórico completo)      │
│ Clientes novos x recorrentes (período)                        │
└───────────────────────────────────────────────────────────────┘

Atalhos rápidos (grid 2 colunas): "Fila do dia" · "Orçamentos"
Rodapé: aviso sobre regime de faturamento por data de abertura
```

Só **"Faturamento do mês"**, **"Metas de {mês}"** e a **taxa de retorno**
ficam fora do seletor de período global (por design: são indicadores "de
agora" ou de janela fixa, não faz sentido presos ao período escolhido).
Todos os outros títulos de card mostram `({período.label})` dinamicamente.

---

## 3. Inventário de cards e origem dos dados

| Card | Componente | Fonte |
|---|---|---|
| Faturamento do mês | `MetaFaturamentoCard` | `resumo.mes` + `unidade.meta_mensal` |
| Faturamento (período) | `StatCard` | `resumo.periodo.faturamento` |
| Veículos atendidos | `StatCard` | `resumo.periodo.qtd_servicos` |
| Ticket médio | `StatCard` | derivado de `resumo.periodo` |
| Taxa de retorno (90 dias) | `StatCard` | `insights.taxa_retorno` |
| Faixa de insights | `InsightsFaixa` | `lib/dashboard-insights-texto.ts` (`gerarInsights`) |
| Operação agora | `FaixaOperacional` | campos diretos de `resumo` |
| Histórico de faturamento | `GraficoCombinado` | `insights.evolucao_diaria` |
| Metas de {mês} | `MetasDoMesCard` | `resumo.mes` + `unidade.meta_mensal`/`capacidade_dia` |
| Comparativo entre unidades | `ComparativoUnidadesTabela` | `insights.comparativo_unidades` |
| Mix de serviços | `DonutChart` | `insights.top_servicos` |
| Fila de ação | `FilaDeAcao` | RPC `clientes_para_reativar` + `orcamentos` |
| Atividade recente | `AtividadeRecente` | consulta própria (últimas OS) |
| Resumo de veículos | `VeiculosResumoCard` | `resumo.hoje/semana/mes` + `capacidade_dia` |
| Desconto médio | `StatCard` | `insights.desconto_medio` |
| Clientes e receita por origem | `BarListChart` | `insights.por_origem` |
| Faturamento por porte | `BarListChart` | `insights.faturamento_por_porte` |
| Formas de pagamento | `DonutChart` | `insights.formas_pagamento` |
| Ranking de clientes | `BarListChart` | `insights.top_clientes` (não filtra por período) |
| Novos x recorrentes | `NovosXRecorrentesCard` | `insights.novos_x_recorrentes` |

---

## 4. Cards com design system próprio (hex fixos, não os tokens do tema)

Dois cards têm paleta fechada, pedida explicitamente com valores exatos, em
vez de usar os tokens `--chart-*`/`--primary` do tema. Ambos detectam o
tema claro/escuro via `next-themes` e trocam de paleta sozinhos.

### Histórico de faturamento (`grafico-combinado.tsx`)

| Token | Claro | Escuro |
|---|---|---|
| Fundo do cartão | `#FFFFFF` | `#10161A` |
| Barra (faturamento) | `#F9C400` | `#FFD600` |
| Linha de tendência (média móvel) | `#FF8A00` | `#FFB800` |
| Linha principal (veículos) | `#111111` | `#F7F7F5` |
| Grade | `#E7E7E7` | `#20282D` |
| Borda | `#ECECEC` | `#20282D` |

Barra com `radius: 3px`, linha principal `2px` com marcador de `4px`
(preenchido na cor da barra, contorno na cor da linha), linha de tendência
tracejada. Eixos em 12px, legenda em `text-xs`, título `text-sm font-medium`
(mesmo tamanho dos demais cards — foi ajustado depois de ficar
desproporcional com valores menores do spec original).

### Metas de {mês} (`metas-do-mes-card.tsx`)

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#FFF9EC` | `#10161A` |
| Título | `#6B665C` | `#A7ADA0` |
| Texto principal | `#292620` | `#F7F7F5` |
| Texto secundário | `#777168` | `#A7ADA0` |
| Amarelo (barras) | `#FFC400` | `#FFD600` |
| Amarelo (anel) | `#FFBC32` | `#FFC94D` |
| Trilho das barras | `#E1DACB` | `rgba(255,255,255,0.1)` |
| Marcador de ritmo esperado | `#8B877F` | `rgba(255,255,255,0.45)` |
| Badge "acima do alvo" (verde) | `#438451` / bg `#ECF8EF` | `#5FCE7C` / bg translúcido |
| Badge "abaixo do alvo" (âmbar) | `#C48A2C` / bg `#FFF0D4` | `#FFD600` / bg translúcido |

Anel de 110px com o percentual real da meta (pode passar de 100%), frase de
projeção de fechamento do mês, badge de status (acima do alvo / dentro do
esperado / abaixo do alvo), barras de Faturamento e Veículos com um
marcador vertical mostrando onde a meta deveria estar hoje, e rodapé com o
"ritmo necessário por dia" pra bater a meta.

**Regra de negócio importante:** a Polibrilho atende de **segunda a
sábado** — só domingo é dia fechado. Todo cálculo de ritmo/projeção/dias de
operação neste card usa essa contagem (mês inteiro menos os domingos), não
o conceito genérico de "dia útil" (seg-sex) de templates corporativos.

---

## 5. Tipografia e tamanhos padrão (cards no tema geral)

- Título de card: `text-sm font-medium` (14px/500), cor `text-foreground`
  (preto no claro, branco no escuro) — foi `text-muted-foreground` antes,
  trocado porque os títulos estavam cinza demais.
- Rótulo de KPI (`StatCard`): `text-sm font-medium text-foreground`.
- Legendas/subtextos: `text-xs text-muted-foreground`.
- Eixos de gráfico (Recharts): 12px, cor `var(--muted-foreground)`.

---

## 6. Paleta categórica dos gráficos com múltiplas cores

Quando um gráfico precisa de mais de uma cor (fatias de rosca, séries
comparadas), a regra é usar variações de amarelo/dourado em vez de cores
categóricas genéricas (verde/laranja/vermelho) — mantém a identidade da
marca em vez de dispersar em várias cores. A distinção entre categorias
fica por conta da legenda (nome + valor ao lado de cada cor), não do
contraste de matiz.

Exemplo (`donut-chart.tsx`, `CORES_DONUT`):
`var(--chart-1)` (amarelo do tema) → `#E0A100` → `#B8860B` → `#F5D26B`.

`--chart-1` no tema global também foi unificado pro mesmo amarelo
(`#F9C400` claro / `#FFD600` escuro), então `BarListChart` e o lado
"novos" de `NovosXRecorrentesCard` já saem amarelos automaticamente.

---

## 7. Componentes reutilizáveis

| Componente | Uso |
|---|---|
| `StatCard` | KPI genérico: ícone, título, valor, variação vs. período anterior, legenda opcional, destaque opcional |
| `DonutChart` | Rosca com legenda (nome, valor, %) abaixo, link opcional |
| `BarListChart` | Barras horizontais ranqueadas, com rótulo de valor na ponta de cada barra |
| `FaixaOperacional` | Tira de indicadores "de agora", cada um com cor própria (violeta/azul/âmbar/esmeralda/preto), OS atrasadas vira vermelho quando > 0 |
| `InsightsFaixa` | Ticker horizontal com rolagem automática (35s), pausa no hover |
| `SeletorPeriodo` | Dropdown de período + range de datas customizado |

---

## 8. Shell do site (fora do dashboard, mas afeta o layout dele)

- `AppShell` (`src/components/app-shell.tsx`) ocupa `h-screen` (não mais
  `min-h-screen`) — só o `<main>` rola, barra lateral e cabeçalho ficam
  fixos.
- Sem a "moldura flutuante" (max-width 1440px + cantos arredondados) que
  existia antes — o site ocupa 100% da largura da tela.
- Sem barra de busca global no topo (removida).
- Sem o cartão promocional "Excelência em cada detalhe" na barra lateral
  (removido).
- Favicon é a logo da Polibrilho (`src/app/icon.png`), não o ícone padrão
  do Next.js.

---

## 9. Fontes usadas

- Site inteiro: **Inter** (via `next/font/google`), tanto texto quanto
  títulos. Chegou a ser testada a fonte **Aptos**, mas ela é proprietária
  da Microsoft e não tem arquivo redistribuível pra embutir — não deu pra
  usar de verdade, nem no site nem nos PDFs (que usam Helvetica pelo mesmo
  motivo).
