import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getCurrentUsuario } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const usuario = await getCurrentUsuario();

  return <DashboardContent nomeUsuario={usuario.nome} />;
}
