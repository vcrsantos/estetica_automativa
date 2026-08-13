import Link from "next/link";
import { Plus } from "lucide-react";

import { getCurrentUsuario } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ServicosPage() {
  const usuario = await getCurrentUsuario();
  const isAdmin = usuario.perfil === "administrador";

  const supabase = await createClient();
  const { data: servicos } = await supabase
    .from("servicos")
    .select("*")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo de serviços</h1>
          <p className="text-muted-foreground">
            Serviços e preços de referência por porte e unidade.
          </p>
        </div>
        {isAdmin && (
          <Button render={<Link href="/servicos/novo" />} nativeButton={false} className="w-full sm:w-fit">
            <Plus className="size-4" />
            Novo serviço
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead className="hidden sm:table-cell">Exige veículo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!servicos || servicos.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum serviço cadastrado.
                </TableCell>
              </TableRow>
            )}

            {servicos?.map((servico) => (
              <TableRow key={servico.id}>
                <TableCell>
                  <Link href={`/servicos/${servico.id}`} className="font-medium hover:underline">
                    {servico.nome}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {servico.categoria || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {servico.exige_veiculo ? "Sim" : "Não"}
                </TableCell>
                <TableCell>
                  <Badge variant={servico.ativo ? "success" : "outline"}>
                    {servico.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
