import { exigirPermissao } from "@/lib/auth/current-user";
import { NovoServicoPage } from "./novo-servico-page";

export default async function Page() {
  await exigirPermissao("catalogo", "editar");
  return <NovoServicoPage />;
}
