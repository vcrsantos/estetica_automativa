import { notFound } from "next/navigation";

import { ReciboDetail } from "@/components/recibos/recibo-detail";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function ReciboDetailPage({ params }: PageProps<"/recibos/[id]">) {
  const { id } = await params;
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const { data: recibo } = await supabase.from("recibo").select("*").eq("id", id).single();

  if (!recibo) {
    notFound();
  }

  const [{ data: itens }, { data: vinculos }] = await Promise.all([
    supabase.from("recibo_item").select("*").eq("recibo_id", recibo.id).order("ordem"),
    supabase.from("recibo_os").select("os_id").eq("recibo_id", recibo.id),
  ]);

  const osIds = (vinculos ?? []).map((v) => v.os_id);
  const { data: osVinculadas } = osIds.length
    ? await supabase.from("ordens_servico").select("*").in("id", osIds)
    : { data: [] };

  return (
    <ReciboDetail
      recibo={recibo}
      itens={itens ?? []}
      osVinculadas={osVinculadas ?? []}
      isAdmin={usuario.perfil === "administrador"}
    />
  );
}
