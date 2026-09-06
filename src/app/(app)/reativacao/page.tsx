import { ReativacaoList } from "@/components/reativacao/reativacao-list";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function ReativacaoPage() {
  await exigirPermissao("reativacao");
  return <ReativacaoList />;
}
