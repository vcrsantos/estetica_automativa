"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { Preco, Servico } from "@/types/database";
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

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResumoPreco({ servico, precos, unidadeId }: { servico: Servico; precos: Preco[]; unidadeId: string | null }) {
  const doServico = precos.filter(
    (p) => p.servico_id === servico.id && (unidadeId === null || p.unidade_id === unidadeId)
  );
  if (doServico.length === 0) {
    return <span className="text-muted-foreground">Não configurado</span>;
  }

  const valores = doServico.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return <>{min === max ? formatarMoeda(min) : `${formatarMoeda(min)} – ${formatarMoeda(max)}`}</>;
}

export function ServicosList({
  servicos: servicosIniciais,
  precos,
  isAdmin,
}: {
  servicos: Servico[];
  precos: Preco[];
  isAdmin: boolean;
}) {
  const { unidadeSelecionadaId } = useUnidade();
  const [servicos, setServicos] = React.useState(servicosIniciais);
  const [excluindoId, setExcluindoId] = React.useState<string | null>(null);

  async function excluirServico(servico: Servico) {
    if (!window.confirm(`Excluir o serviço "${servico.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoId(servico.id);
    const supabase = createClient();
    const { error } = await supabase.from("servicos").delete().eq("id", servico.id);
    setExcluindoId(null);

    if (error) {
      if (error.code === "23503") {
        toast.error(
          "Este serviço já foi usado em ordens de serviço ou orçamentos e não pode ser excluído. Desative-o em vez disso."
        );
      } else {
        toast.error("Não foi possível excluir o serviço.");
      }
      return;
    }

    setServicos((atual) => atual.filter((s) => s.id !== servico.id));
    toast.success("Serviço excluído.");
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="hidden sm:table-cell">Exige veículo</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {servicos.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
                Nenhum serviço cadastrado.
              </TableCell>
            </TableRow>
          )}

          {servicos.map((servico) => (
            <TableRow key={servico.id}>
              <TableCell>
                <Link href={`/servicos/${servico.id}`} className="font-medium hover:underline">
                  {servico.nome}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">
                <ResumoPreco servico={servico} precos={precos} unidadeId={unidadeSelecionadaId} />
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
              {isAdmin && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar serviço"
                      render={<Link href={`/servicos/${servico.id}`} />}
                      nativeButton={false}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir serviço"
                      className="text-destructive hover:text-destructive"
                      disabled={excluindoId === servico.id}
                      onClick={() => excluirServico(servico)}
                    >
                      {excluindoId === servico.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
