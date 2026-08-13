import { NovaOsForm } from "@/components/ordens/nova-os-form";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NovaOsPage() {
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const [{ data: unidades }, { data: servicos }, { data: precos }] = await Promise.all([
    supabase.from("unidades").select("*").eq("ativo", true).order("nome"),
    supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
    supabase.from("precos").select("*"),
  ]);

  const unidadeFixaId = usuario.perfil === "administrador" ? null : usuario.unidade_id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Ordem de Serviço</h1>
        <p className="text-muted-foreground">Busque o cliente e toque nos serviços para adicionar.</p>
      </div>

      <NovaOsForm
        unidades={unidades ?? []}
        unidadeFixaId={unidadeFixaId}
        servicos={servicos ?? []}
        precos={precos ?? []}
      />
    </div>
  );
}
