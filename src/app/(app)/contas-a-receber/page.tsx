import { ContasAReceberList } from "@/components/financeiro/contas-a-receber-list";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function ContasAReceberPage() {
  await exigirPermissao("financeiro");
  return <ContasAReceberList />;
}
