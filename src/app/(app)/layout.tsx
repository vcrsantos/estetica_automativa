import { AppShell } from "@/components/app-shell";
import { getCurrentUsuario, getUnidadesDoUsuario } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getCurrentUsuario();
  const unidades = await getUnidadesDoUsuario();

  return (
    <AppShell usuario={usuario} unidades={unidades}>
      {children}
    </AppShell>
  );
}
