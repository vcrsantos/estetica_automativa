import { HistoricoList } from "@/components/ordens/historico-list";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function HistoricoPage() {
  await exigirPermissao("servicos");
  return <HistoricoList />;
}
