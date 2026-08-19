import { notFound } from "next/navigation";

import { ClienteDetail } from "@/components/clientes/cliente-detail";
tuça import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function ClienteDetailPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const [{ data: cliente }, { data: veiculos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase.from("veiculos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }),
  ]);

  if (!cliente) {
    notFound();
  }

  return (
    <ClienteDetail
      cliente={cliente}
      veiculos={veiculos ?? []}
      isAdmin={usuario.perfil === "administrador"}
    />
  );
}
