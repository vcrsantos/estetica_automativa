import { RecibosList } from "@/components/recibos/recibos-list";
import { exigirPermissao } from "@/lib/auth/current-user";
import { podeEditarAba } from "@/lib/abas";

export default async function RecibosPage() {
  const usuario = await exigirPermissao("recibos");

  return <RecibosList isAdmin={podeEditarAba(usuario, "recibos")} />;
}
