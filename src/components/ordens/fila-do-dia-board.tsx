"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Car, CheckCircle2, History, Plus, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, StatusOs, Veiculo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";

const COLUNAS: { status: StatusOs; titulo: string; icon: typeof Calendar }[] = [
  { status: "agendado", titulo: "Agendado", icon: Calendar },
  { status: "em_execucao", titulo: "Em execução", icon: PlayCircle },
  { status: "finalizado", titulo: "Finalizado", icon: CheckCircle2 },
];

export function FilaDoDiaBoard() {
  const { unidadeSelecionadaId } = useUnidade();
  const [ordens, setOrdens] = React.useState<OrdemServico[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [veiculos, setVeiculos] = React.useState<Map<string, Veiculo>>(new Map());
  const [carregando, setCarregando] = React.useState(true);
  const [alterandoId, setAlterandoId] = React.useState<string | null>(null);
  const [colunaArrastandoSobre, setColunaArrastandoSobre] = React.useState<StatusOs | null>(null);

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

  async function alterarStatus(osId: string, novoStatus: StatusOs) {
    setAlterandoId(osId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({ status: novoStatus })
      .eq("id", osId)
      .select("*")
      .single();
    setAlterandoId(null);

    if (error || !data) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    setOrdens((atual) => atual.map((o) => (o.id === osId ? data : o)));
    toast.success(`Status atualizado para "${STATUS_OS_LABELS[novoStatus]}".`);
  }

  function aoSoltarNaColuna(evento: React.DragEvent<HTMLDivElement>, status: StatusOs) {
    evento.preventDefault();
    setColunaArrastandoSobre(null);
    const osId = evento.dataTransfer.getData("text/plain");
    if (!osId) return;
    const os = ordens.find((o) => o.id === osId);
    if (!os || os.status === status) return;
    alterarStatus(osId, status);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Fila do dia</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/ordens" />} nativeButton={false}>
            <History className="size-4" />
            Histórico
          </Button>
          <Button variant="gradient" render={<Link href="/ordens/novo" />} nativeButton={false}>
            <Plus className="size-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Arraste o cartão para outra coluna, ou use os botões de status nele, para atualizar sem abrir a OS.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {COLUNAS.map((coluna) => {
          const ordensDaColuna = ordens.filter((o) => o.status === coluna.status);
          return (
            <div
              key={coluna.status}
              className={cn(
                "flex flex-col gap-2 rounded-lg p-1 transition-colors",
                colunaArrastandoSobre === coluna.status && "bg-accent"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                if (colunaArrastandoSobre !== coluna.status) setColunaArrastandoSobre(coluna.status);
              }}
              onDragLeave={() => setColunaArrastandoSobre(null)}
              onDrop={(e) => aoSoltarNaColuna(e, coluna.status)}
            >
              <div className="flex items-center justify-between px-1">
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
                      <Link
                        key={os.id}
                        href={`/ordens/${os.id}`}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", os.id)}
                      >
                        <Card className="cursor-grab transition-colors hover:bg-accent active:cursor-grabbing">
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

                            <div className="mt-1 flex gap-1">
                              {COLUNAS.map((c) => {
                                const Icon = c.icon;
                                const ativo = c.status === os.status;
                                return (
                                  <button
                                    key={c.status}
                                    type="button"
                                    aria-label={`Mover para ${c.titulo}`}
                                    disabled={ativo || alterandoId === os.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      alterarStatus(os.id, c.status);
                                    }}
                                    className={cn(
                                      "flex flex-1 items-center justify-center rounded-md border py-1 transition-colors",
                                      ativo
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                                    )}
                                  >
                                    <Icon className="size-3.5" />
                                  </button>
                                );
                              })}
                            </div>
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
