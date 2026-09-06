import { FilaDoDiaBoard } from "@/components/ordens/fila-do-dia-board";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function FilaDoDiaPage() {
  await exigirPermissao("servicos");
  return <FilaDoDiaBoard />;
}
