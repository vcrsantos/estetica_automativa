import { NovoOrcamentoForm } from "@/components/orcamentos/novo-orcamento-form";
import { exigirPermissao, getUnidadesDoUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NovoOrcamentoPage() {
  await exigirPermissao("orcamentos", "editar");
  const supabase = await createClient();

  const [unidades, { data: servicos }, { data: precos }] = await Promise.all([
    getUnidadesDoUsuario(),
    supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
    supabase.from("precos").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo orçamento</h1>
        <p className="text-muted-foreground">
          Pode ser para um cliente cadastrado ou só com nome e telefone.
        </p>
      </div>

      <NovoOrcamentoForm unidades={unidades} servicos={servicos ?? []} precos={precos ?? []} />
    </div>
  );
}
