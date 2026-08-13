import { AppShell } from "@/components/app-shell";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getCurrentUsuario();

  const supabase = await createClient();
  const { data: unidades } = await supabase
    .from("unidades")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  return (
    <AppShell usuario={usuario} unidades={unidades ?? []}>
      {children}
    </AppShell>
  );
}
