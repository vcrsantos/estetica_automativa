import { PrestacaoContasContent } from "@/components/prestacao-contas/prestacao-contas-content";
import { exigirPermissao, getUnidadesDoUsuario } from "@/lib/auth/current-user";

export default async function PrestacaoContasPage() {
  await exigirPermissao("prestacao");
  const unidades = await getUnidadesDoUsuario();

  return <PrestacaoContasContent unidades={unidades} />;
}
