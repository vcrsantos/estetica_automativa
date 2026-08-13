"use client";

import * as React from "react";
import Link from "next/link";
import { Car, History, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { Cliente, OrdemServico, StatusOs, Veiculo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";

const COLUNAS: { status: StatusOs; titulo: string }[] = [
  { status: "agendado", titulo: "Agendado" },
  { status: "em_execucao", titulo: "Em execução" },
  { status: "finalizado", titulo: "Finalizado" },
];

export function FilaDoDiaBoard() {
  const { unidadeSelecionadaId } = useUnidade();
  const [ordens, setOrdens] = React.useState<OrdemServico[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [veiculos, setVeiculos] = React.useState<Map<string, Veiculo>>(new Map());
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .in("status", ["agendado", "em_execucao", "finalizado"])
        .order("entrada_em", { ascending: true });

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { data: os } = await query;
      if (cancelado || !os) return;

      const clienteIds = [...new Set(os.map((o) => o.cliente_id))];
      const veiculoIds = [...new Set(os.map((o) => o.veiculo_id).filter((id): id is string => !!id))];

      const [{ data: clientesData }, { data: veiculosData }] = await Promise.all([
        clienteIds.length
          ? supabase.from("clientes").select("*").in("id", clienteIds)
          : Promise.resolve({ data: [] as Cliente[] }),
        veiculoIds.length
          ? supabase.from("veiculos").select("*").in("id", veiculoIds)
          : Promise.resolve({ data: [] as Veiculo[] }),
      ]);

      if (cancelado) return;

      setOrdens(os);
      setClientes(new Map((clientesData ?? []).map((c) => [c.id, c])));
      setVeiculos(new Map((veiculosData ?? []).map((v) => [v.id, v])));
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
        <h1 className="text-2xl font-semibold tracking-tight">Fila do dia</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/ordens" />} nativeButton={false}>
            <History className="size-4" />
            Histórico
          </Button>
          <Button render={<Link href="/ordens/novo" />} nativeButton={false}>
            <Plus className="size-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUNAS.map((coluna) => {
          const ordensDaColuna = ordens.filter((o) => o.status === coluna.status);
          return (
            <div key={coluna.status} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">{coluna.titulo}</h2>
                <Badge variant="outline">{ordensDaColuna.length}</Badge>
              </div>

              <div className="flex flex-col gap-2">
                {carregando &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}

                {!carregando && ordensDaColuna.length === 0 && (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Nenhuma OS aqui.
                  </p>
                )}

                {!carregando &&
                  ordensDaColuna.map((os) => {
                    const cliente = clientes.get(os.cliente_id);
                    const veiculo = os.veiculo_id ? veiculos.get(os.veiculo_id) : null;
                    return (
                      <Link key={os.id} href={`/ordens/${os.id}`}>
                        <Card className="transition-colors hover:bg-accent">
                          <CardContent className="flex flex-col gap-1 py-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{cliente?.nome ?? "Cliente"}</span>
                              <span className="text-xs text-muted-foreground">#{os.numero}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Car className="size-3.5" />
                              {veiculo ? veiculo.placa || veiculo.modelo || "Veículo" : "Sem veículo"}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {new Date(os.entrada_em).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="font-medium">
                                {os.valor_total.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </span>
                            </div>
                            <StatusPagamentoBadge status={os.status_pagamento} />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
