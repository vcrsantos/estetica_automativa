"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, StatusOs } from "@/types/database";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const STATUS_BADGE_VARIANT: Record<StatusOs, "info" | "outline" | "destructive" | "success"> = {
  agendado: "outline",
  em_execucao: "info",
  finalizado: "success",
  entregue: "success",
  cancelado: "destructive",
};

const LIMITE = 6;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tempoRelativo(dataIso: string) {
  const diffMs = Date.now() - new Date(dataIso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} d`;
}

export function AtividadeRecente() {
  const { unidadeSelecionadaId } = useUnidade();
  const [ordens, setOrdens] = React.useState<(OrdemServico & { cliente: Cliente | null })[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(LIMITE);

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { data: dadosOrdens } = await query;
      if (cancelado) return;

      if (!dadosOrdens || dadosOrdens.length === 0) {
        setOrdens([]);
        setCarregando(false);
        return;
      }

      const clienteIds = [...new Set(dadosOrdens.map((o) => o.cliente_id))];
      const { data: clientes } = await supabase.from("clientes").select("*").in("id", clienteIds);
      if (cancelado) return;

      const clientesMap = new Map((clientes ?? []).map((c) => [c.id, c]));
      setOrdens(dadosOrdens.map((o) => ({ ...o, cliente: clientesMap.get(o.cliente_id) ?? null })));
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Atividade recente</CardTitle>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : ordens.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma OS registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status do serviço</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="hidden sm:table-cell">OS</TableHead>
                  <TableHead className="hidden sm:table-cell">Quando</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordens.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell>
                      <Link href={`/ordens/${os.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar size="sm">
                          <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                            {iniciais(os.cliente?.nome ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        {os.cliente?.nome ?? "Cliente removido"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[os.status]}>{STATUS_OS_LABELS[os.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {os.status !== "cancelado" ? (
                        <StatusPagamentoBadge status={os.status_pagamento} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">#{os.numero}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {tempoRelativo(os.criado_em)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatarMoeda(os.valor_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!carregando && ordens.length > 0 && (
          <Link
            href="/ordens"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todas as atividades
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
