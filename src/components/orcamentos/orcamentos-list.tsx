"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { Cliente, Orcamento, StatusOrcamento } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

const STATUS_BADGE_VARIANT: Record<StatusOrcamento, "info" | "outline" | "destructive" | "success" | "warning"> = {
  rascunho: "outline",
  enviado: "info",
  aprovado: "success",
  recusado: "destructive",
  expirado: "warning",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentosList() {
  const { unidadeSelecionadaId } = useUnidade();
  const [orcamentos, setOrcamentos] = React.useState<Orcamento[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase.from("orcamentos").select("*").order("criado_em", { ascending: false });
      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { data: lista } = await query;
      if (cancelado || !lista) return;

      const clienteIds = [...new Set(lista.map((o) => o.cliente_id).filter((id): id is string => !!id))];
      const { data: clientesData } = clienteIds.length
        ? await supabase.from("clientes").select("*").in("id", clienteIds)
        : { data: [] as Cliente[] };

      if (cancelado) return;
      setOrcamentos(lista);
      setClientes(new Map((clientesData ?? []).map((c) => [c.id, c])));
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Crie, envie por WhatsApp e converta em OS.</p>
        </div>
        <Button render={<Link href="/orcamentos/novo" />} nativeButton={false}>
          <Plus className="size-4" />
          Novo orçamento
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Validade</TableHead>
              <TableHead className="hidden sm:table-cell">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && orcamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum orçamento criado ainda.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              orcamentos.map((orcamento) => {
                const cliente = orcamento.cliente_id ? clientes.get(orcamento.cliente_id) : null;
                const nome = cliente?.nome ?? orcamento.contato_nome ?? "—";
                return (
                  <TableRow key={orcamento.id}>
                    <TableCell>
                      <Link href={`/orcamentos/${orcamento.id}`} className="font-medium hover:underline">
                        #{orcamento.numero} · {nome}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {orcamento.validade_em
                        ? new Date(orcamento.validade_em).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatarMoeda(orcamento.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[orcamento.status]}>
                        {STATUS_LABELS[orcamento.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
