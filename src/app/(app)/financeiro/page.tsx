import { exigirPermissao } from "@/lib/auth/current-user";
import { podeEditarAba } from "@/lib/abas";
import { FinanceiroContent } from "@/components/financeiro/financeiro-content";

export default async function FinanceiroPage() {
  const usuario = await exigirPermissao("financeiro");
  return <FinanceiroContent podeEditar={podeEditarAba(usuario, "financeiro")} />;
}
