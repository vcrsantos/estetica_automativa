import { notFound } from "next/navigation";

import { OrdemDetail } from "@/components/ordens/ordem-detail";
import { exigirPermissao } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function OrdemDetailPage({ params }: PageProps<"/ordens/[id]">) {
  await exigirPermissao("servicos");
  const { id } = await params;
  const supabase = await createClient();

  const { data: os } = await supabase.from("ordens_servico").select("*").eq("id", id).single();

  if (!os) {
    notFound();
  }

  const [{ data: cliente }, { data: veiculo }, { data: unidade }, { data: itens }, { data: osExecutores }] =
    await Promise.all([
      supabase.from("clientes").select("*").eq("id", os.cliente_id).single(),
      os.veiculo_id
        ? supabase.from("veiculos").select("*").eq("id", os.veiculo_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("unidades").select("*").eq("id", os.unidade_id).single(),
      supabase.from("os_itens").select("*").eq("os_id", os.id),
      supabase.from("os_executores").select("*").eq("os_id", os.id),
    ]);

  if (!cliente || !unidade) {
    notFound();
  }

  let executoresNomes: string[] = [];
  if (osExecutores && osExecutores.length > 0) {
    const { data: executores } = await supabase
      .from("executores")
      .select("*")
      .in(
        "id",
        osExecutores.map((oe) => oe.executor_id)
      );
    executoresNomes = (executores ?? []).map((e) => e.nome);
  }

  return (
    <OrdemDetail
      os={os}
      cliente={cliente}
      veiculo={veiculo}
      unidade={unidade}
      itens={itens ?? []}
      executoresNomes={executoresNomes}
    />
  );
}
