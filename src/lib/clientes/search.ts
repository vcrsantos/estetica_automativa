import type { SupabaseClient } from "@supabase/supabase-js";

import type { Cliente, Database } from "@/types/database";

/**
 * Busca clientes por nome, telefone ou placa de veículo — usada tanto na
 * listagem de clientes quanto no cadastro rápido dentro de outros fluxos
 * (ex.: abertura de OS).
 */
export async function searchClientes(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 20
): Promise<Cliente[]> {
  const termo = query.trim();

  if (!termo) {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true })
      .limit(limit);
    return data ?? [];
  }

  const [porNomeOuTelefone, porPlaca] = await Promise.all([
    supabase
      .from("clientes")
      .select("*")
      .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
      .limit(limit),
    supabase.from("veiculos").select("cliente_id").ilike("placa", `%${termo}%`).limit(limit),
  ]);

  const clientesEncontrados = new Map<string, Cliente>();
  for (const cliente of porNomeOuTelefone.data ?? []) {
    clientesEncontrados.set(cliente.id, cliente);
  }

  const idsPorPlaca = (porPlaca.data ?? []).map((v) => v.cliente_id);
  if (idsPorPlaca.length > 0) {
    const faltantes = idsPorPlaca.filter((id) => !clientesEncontrados.has(id));
    if (faltantes.length > 0) {
      const { data } = await supabase.from("clientes").select("*").in("id", faltantes);
      for (const cliente of data ?? []) {
        clientesEncontrados.set(cliente.id, cliente);
      }
    }
  }

  return Array.from(clientesEncontrados.values())
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .slice(0, limit);
}
