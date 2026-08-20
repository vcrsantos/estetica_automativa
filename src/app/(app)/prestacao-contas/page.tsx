import { PrestacaoContasContent } from "@/components/prestacao-contas/prestacao-contas-content";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function PrestacaoContasPage() {
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const { data: unidades } = await supabase.from("unidades").select("*").eq("ativo", true).order("nome");
  const unidadeFixaId = usuario.perfil === "administrador" ? null : usuario.unidade_id;

  return <PrestacaoContasContent unidades={unidades ?? []} unidadeFixaId={unidadeFixaId} />;
}
