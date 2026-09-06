import { OrcamentosList } from "@/components/orcamentos/orcamentos-list";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function OrcamentosPage() {
  await exigirPermissao("orcamentos");
  return <OrcamentosList />;
}
