import { NovoOrcamentoForm } from "@/components/orcamentos/novo-orcamento-form";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NovoOrcamentoPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
        <p className="text-muted-foreground">
          Pode ser para um cliente cadastrado ou só com nome e telefone.
        </p>
      </div>

      <NovoOrcamentoForm
        unidades={unidades ?? []}
        unidadeFixaId={unidadeFixaId}
        servicos={servicos ?? []}
        precos={precos ?? []}
      />
    </div>
  );
}
