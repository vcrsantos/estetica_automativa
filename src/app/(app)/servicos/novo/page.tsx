import { redirect } from "next/navigation";

import { getCurrentUsuario } from "@/lib/auth/current-user";
import { NovoServicoPage } from "./novo-servico-page";

export default async function Page() {
  const usuario = await getCurrentUsuario();
  if (usuario.perfil !== "administrador") {
    redirect("/servicos");
  }

  return <NovoServicoPage />;
}
