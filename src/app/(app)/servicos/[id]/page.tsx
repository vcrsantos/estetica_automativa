import { notFound } from "next/navigation";

import { ServicoDetail } from "@/components/servicos/servico-detail";
import { exigirPermissao } from "@/lib/auth/current-user";
import { podeEditarAba } from "@/lib/abas";
import { createClient } from "@/lib/supabase/server";

export default async function ServicoDetailPage({ params }: PageProps<"/servicos/[id]">) {
  const { id } = await params;
  const usuario = await exigirPermissao("catalogo");
  const supabase = await createClient();

  const [{ data: servico }, { data: unidades }, { data: precos }] = await Promise.all([
    supabase.from("servicos").select("*").eq("id", id).single(),
    supabase.from("unidades").select("*").eq("ativo", true).order("nome"),
    supabase.from("precos").select("*").eq("servico_id", id),
  ]);

  if (!servico) {
    notFound();
  }

  return (
    <ServicoDetail
      servico={servico}
      unidades={unidades ?? []}
      precos={precos ?? []}
      isAdmin={podeEditarAba(usuario, "catalogo")}
    />
  );
}
