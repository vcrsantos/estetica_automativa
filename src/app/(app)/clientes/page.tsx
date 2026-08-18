import { ClientesExplorer } from "@/components/clientes/clientes-explorer";
import { getCurrentUsuario } from "@/lib/auth/current-user";
import { searchClientes } from "@/lib/clientes/search";
import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { busca } = await searchParams;
  const termoInicial = typeof busca === "string" ? busca : "";

  const usuario = await getCurrentUsuario();
  const supabase = await createClient();
  const clientes = termoInicial
    ? await searchClientes(supabase, termoInicial, 30)
    : (
        await supabase
          .from("clientes")
          .select("*")
          .order("nome", { ascending: true })
          .limit(30)
      ).data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Busque por nome, telefone ou placa.</p>
      </div>
      <ClientesExplorer
        initialClientes={clientes}
        termoInicial={termoInicial}
        isAdmin={usuario.perfil === "administrador"}
      />
    </div>
  );
}
