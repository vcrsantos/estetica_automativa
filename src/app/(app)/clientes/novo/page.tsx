import { exigirPermissao } from "@/lib/auth/current-user";

import { NovoClientePage } from "./novo-cliente-page";

export default async function Page() {
  await exigirPermissao("clientes", "editar");
  return <NovoClientePage />;
}
