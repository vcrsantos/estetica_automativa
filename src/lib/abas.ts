export type AbaSlug =
  | "dashboard"
  | "agenda"
  | "clientes"
  | "catalogo"
  | "servicos"
  | "orcamentos"
  | "reativacao"
  | "recibos"
  | "prestacao"
  | "financeiro";

export type NivelPermissao = "nenhum" | "ver" | "editar";

export type Permissoes = Partial<Record<AbaSlug, NivelPermissao>>;

/**
 * Fonte única da verdade das abas do sistema: a tela de permissões em
 * Usuários e as guardas de rota (exigirPermissao) leem daqui — ninguém
 * escreve o slug na mão. Uma aba nova nasce fechada pra todo mundo (chave
 * ausente em `permissoes` conta como 'nenhum').
 */
/** Administrador sempre pode editar, independente de `permissoes`. */
export function podeEditarAba(
  usuario: { perfil: string; permissoes: Permissoes },
  aba: AbaSlug
) {
  return usuario.perfil === "administrador" || usuario.permissoes?.[aba] === "editar";
}

export const ABAS: { slug: AbaSlug; label: string }[] = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "agenda", label: "Agenda" },
  { slug: "clientes", label: "Clientes" },
  { slug: "catalogo", label: "Catálogo (serviços e preços)" },
  { slug: "servicos", label: "Fila do dia / Histórico de OS" },
  { slug: "orcamentos", label: "Orçamentos" },
  { slug: "reativacao", label: "Reativação de clientes" },
  { slug: "recibos", label: "Recibos" },
  { slug: "prestacao", label: "Prestação de contas" },
  { slug: "financeiro", label: "Financeiro" },
];
