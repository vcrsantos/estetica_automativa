import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AbaSlug, NivelPermissao } from "@/lib/abas";
import type { Unidade, Usuario } from "@/types/database";

/**
 * Valida a sessão junto ao Supabase Auth (getUser, não getSession) e carrega o
 * perfil correspondente em `usuarios`. Deve ser chamada em toda página/ação
 * protegida — o proxy.ts cobre a navegação, mas layouts não re-executam em
 * toda transição client-side, então a checagem real fica aqui.
 */
export const getCurrentUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    redirect("/login");
  }

  if (usuario.status === "pendente") {
    redirect("/aguardando");
  }

  if (usuario.status !== "ativo") {
    redirect("/login");
  }

  return usuario;
});

/**
 * Guarda de rota por aba (Camada 2 do escopo de acessos): administrador
 * sempre passa, independente do que estiver em `permissoes` — só
 * gerente/atendente são checados de verdade. Chave ausente em `permissoes`
 * conta como 'nenhum' (aba nova nasce fechada). Redireciona pra
 * `/sem-acesso` quando o nível não é suficiente.
 */
export async function exigirPermissao(aba: AbaSlug, nivel: NivelPermissao = "ver") {
  const usuario = await getCurrentUsuario();
  if (usuario.perfil === "administrador") return usuario;

  const atual = usuario.permissoes?.[aba] ?? "nenhum";
  const ok = nivel === "editar" ? atual === "editar" : atual !== "nenhum";
  if (!ok) redirect("/sem-acesso");

  return usuario;
}

/**
 * Unidades que o usuário logado pode ver — via `usuario_unidades`, não mais
 * um `unidade_id` fixo. Um administrador está vinculado a todas as unidades
 * (o cadastro dele já garante isso), então não há caso especial aqui: quem
 * tem 1 vínculo só vê aquela; quem tem 2+ (inclusive todas) ganha a opção de
 * alternar/"Todas as unidades" na tela.
 */
export const getUnidadesDoUsuario = cache(async (): Promise<Unidade[]> => {
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const { data: vinculos } = await supabase
    .from("usuario_unidades")
    .select("unidade_id")
    .eq("usuario_id", usuario.id);

  const ids = (vinculos ?? []).map((v) => v.unidade_id);
  if (ids.length === 0) return [];

  const { data: unidades } = await supabase
    .from("unidades")
    .select("*")
    .in("id", ids)
    .eq("ativo", true)
    .order("nome");

  return unidades ?? [];
});
