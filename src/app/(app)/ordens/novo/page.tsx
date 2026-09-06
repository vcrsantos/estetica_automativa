import { NovaOsForm } from "@/components/ordens/nova-os-form";
import { exigirPermissao, getUnidadesDoUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NovaOsPage() {
  await exigirPermissao("servicos", "editar");
  const supabase = await createClient();

  const [unidades, { data: servicos }, { data: precos }] = await Promise.all([
    getUnidadesDoUsuario(),
    supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
    supabase.from("precos").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Ordem de Serviço</h1>
        <p className="text-muted-foreground">Busque o cliente e toque nos serviços para adicionar.</p>
      </div>

      <NovaOsForm unidades={unidades} servicos={servicos ?? []} precos={precos ?? []} />
    </div>
  );
}
