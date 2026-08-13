import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/database";

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

  if (error || !usuario || !usuario.ativo) {
    redirect("/login");
  }

  return usuario;
});
