import { ClientesExplorer } from "@/components/clientes/clientes-explorer";
import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">Busque por nome, telefone ou placa.</p>
      </div>
      <ClientesExplorer initialClientes={clientes ?? []} />
    </div>
  );
}
