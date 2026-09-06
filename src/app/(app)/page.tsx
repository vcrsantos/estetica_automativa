import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const usuario = await exigirPermissao("dashboard");

  return (
    <DashboardContent nomeUsuario={usuario.nome} isAdmin={usuario.perfil === "administrador"} />
  );
}
