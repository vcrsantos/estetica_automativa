import Link from "next/link";
import { Plus } from "lucide-react";

import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ServicosList } from "@/components/servicos/servicos-list";

export default async function ServicosPage() {
  const usuario = await getCurrentUsuario();
  const isAdmin = usuario.perfil === "administrador";

  const supabase = await createClient();
  const [{ data: servicos }, { data: precos }] = await Promise.all([
    supabase
      .from("servicos")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true }),
    supabase.from("precos").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo de serviços</h1>
          <p className="text-muted-foreground">
            Serviços e preços de referência por porte e unidade.
          </p>
        </div>
        {isAdmin && (
          <Button render={<Link href="/servicos/novo" />} nativeButton={false} className="w-full sm:w-fit">
            <Plus className="size-4" />
            Novo serviço
          </Button>
        )}
      </div>

      <ServicosList servicos={servicos ?? []} precos={precos ?? []} isAdmin={isAdmin} />
    </div>
  );
}
