import { redirect } from "next/navigation";

import { UsuariosList } from "@/components/usuarios/usuarios-list";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const usuario = await getCurrentUsuario();
  if (usuario.perfil !== "administrador") {
    redirect("/sem-acesso");
  }

  const supabase = await createClient();
  const [{ data: usuarios }, { data: unidades }, { data: vinculos }] = await Promise.all([
    supabase.from("usuarios").select("*").order("criado_em"),
    supabase.from("unidades").select("*").eq("ativo", true).order("nome"),
    supabase.from("usuario_unidades").select("*"),
  ]);

  return (
    <UsuariosList
      usuarioAtualId={usuario.id}
      usuarios={usuarios ?? []}
      unidades={unidades ?? []}
      vinculos={vinculos ?? []}
    />
  );
}
