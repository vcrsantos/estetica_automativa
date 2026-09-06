import { ConfiguracaoEmitenteForm } from "@/components/recibos/configuracao-emitente-form";
import { exigirPermissao } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracaoRecibosPage() {
  await exigirPermissao("recibos", "editar");

  const supabase = await createClient();
  const [{ data: unidades }, { data: configuracoes }] = await Promise.all([
    supabase.from("unidades").select("*").eq("ativo", true).order("nome"),
    supabase.from("configuracao_emitente").select("*"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurar emitente dos recibos</h1>
        <p className="text-muted-foreground">
          Dados exibidos no cabeçalho do PDF de cada unidade. Precisa estar preenchido antes de
          emitir o primeiro recibo daquela unidade.
        </p>
      </div>

      <ConfiguracaoEmitenteForm unidades={unidades ?? []} configuracoes={configuracoes ?? []} />
    </div>
  );
}
