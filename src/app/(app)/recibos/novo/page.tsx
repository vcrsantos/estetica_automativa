import { NovoReciboForm } from "@/components/recibos/novo-recibo-form";
import { exigirPermissao, getUnidadesDoUsuario } from "@/lib/auth/current-user";

export default async function NovoReciboPage() {
  await exigirPermissao("recibos", "editar");
  const unidades = await getUnidadesDoUsuario();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Emitir recibo</h1>
        <p className="text-muted-foreground">
          Recibo de prestação de serviço — não é nota fiscal.
        </p>
      </div>

      <NovoReciboForm unidades={unidades} />
    </div>
  );
}
