import { AgendaCalendar } from "@/components/agenda/agenda-calendar";
import { exigirPermissao } from "@/lib/auth/current-user";

export default async function AgendaPage() {
  await exigirPermissao("agenda");
  return <AgendaCalendar />;
}
