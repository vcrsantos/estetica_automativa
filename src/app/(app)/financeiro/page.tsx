import { redirect } from "next/navigation";

import { getCurrentUsuario } from "@/lib/auth/current-user";
import { FinanceiroContent } from "@/components/financeiro/financeiro-content";

export default async function FinanceiroPage() {
  const usuario = await getCurrentUsuario();
  if (usuario.perfil !== "administrador") {
    redirect("/");
  }

  return <FinanceiroContent />;
}
