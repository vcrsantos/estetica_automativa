import { NovoReciboForm } from "@/components/recibos/novo-recibo-form";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NovoReciboPage() {
  const usuario = await getCurrentUsuario();
  const supabase = await createClient();

  const { data: unidades } = await supabase.from("unidades").select("*").eq("ativo", true).order("nome");
  const unidadeFixaId = usuario.perfil === "administrador" ? null : usuario.unidade_id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Emitir recibo</h1>
        <p className="text-muted-foreground">
          Recibo de prestação de serviço — não é nota fiscal.
        </p>
      </div>

      <NovoReciboForm unidades={unidades ?? []} unidadeFixaId={unidadeFixaId} />
    </div>
  );
}
