import { RecibosList } from "@/components/recibos/recibos-list";
import { getCurrentUsuario } from "@/lib/auth/current-user";

export default async function RecibosPage() {
  const usuario = await getCurrentUsuario();

  return <RecibosList isAdmin={usuario.perfil === "administrador"} />;
}
