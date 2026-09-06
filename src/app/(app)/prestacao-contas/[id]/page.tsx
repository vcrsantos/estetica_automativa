import { notFound } from "next/navigation";

import { PrestacaoDetail } from "@/components/prestacao-contas/prestacao-detail";
import { exigirPermissao } from "@/lib/auth/current-user";
import { podeEditarAba } from "@/lib/abas";
import { createClient } from "@/lib/supabase/server";

export default async function PrestacaoDetailPage({ params }: PageProps<"/prestacao-contas/[id]">) {
  const { id } = await params;
  const usuario = await exigirPermissao("prestacao");
  const supabase = await createClient();

  const { data: prestacao } = await supabase.from("prestacao_conta").select("*").eq("id", id).single();

  if (!prestacao) {
    notFound();
  }

  const { data: itens } = await supabase
    .from("prestacao_conta_item")
    .select("*")
    .eq("prestacao_id", prestacao.id)
    .order("data");

  return (
    <PrestacaoDetail
      prestacao={prestacao}
      itens={itens ?? []}
      isAdmin={podeEditarAba(usuario, "prestacao")}
    />
  );
}
