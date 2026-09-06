import { notFound } from "next/navigation";

import { OrcamentoDetail } from "@/components/orcamentos/orcamento-detail";
import { exigirPermissao } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function OrcamentoDetailPage({ params }: PageProps<"/orcamentos/[id]">) {
  await exigirPermissao("orcamentos");
  const { id } = await params;
  const supabase = await createClient();

  const { data: orcamento } = await supabase.from("orcamentos").select("*").eq("id", id).single();

  if (!orcamento) {
    notFound();
  }

  const [{ data: unidade }, { data: cliente }, { data: veiculo }, { data: itens }] = await Promise.all([
    supabase.from("unidades").select("*").eq("id", orcamento.unidade_id).single(),
    orcamento.cliente_id
      ? supabase.from("clientes").select("*").eq("id", orcamento.cliente_id).single()
      : Promise.resolve({ data: null }),
    orcamento.veiculo_id
      ? supabase.from("veiculos").select("*").eq("id", orcamento.veiculo_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("orcamento_itens").select("*").eq("orcamento_id", orcamento.id),
  ]);

  if (!unidade) {
    notFound();
  }

  return (
    <OrcamentoDetail
      orcamento={orcamento}
      unidade={unidade}
      cliente={cliente}
      veiculo={veiculo}
      itens={itens ?? []}
    />
  );
}
