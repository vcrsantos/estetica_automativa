"use client";

import * as React from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import type { PeriodoSelecionado } from "@/lib/dashboard-periodo";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { OrdemServico, StatusPagamento, Veiculo } from "@/types/database";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LIMITE = 4;

const STATUS_PAGAMENTO_CURTO: Record<StatusPagamento, string> = {
  pago: "Pago",
  parcial: "Parcial",
  pendente: "Em aberto",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataIso: string) {
  return new Date(dataIso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function veiculoTexto(veiculo: Veiculo | null) {
  if (!veiculo) return null;
  const partes = [veiculo.modelo, veiculo.cor].filter(Boolean);
  return partes.length > 0 ? partes.join(" ") : veiculo.placa;
}

type OrdemComContexto = OrdemServico & {
  veiculo: Veiculo | null;
  unidadeNome: string | null;
  servicoLabel: string;
};

/** Atividade recente (seção 3.6 do escopo de melhorias): últimas OS lançadas dentro do período selecionado, cada linha resumindo unidade/veículo/data e o status de pagamento. */
export function AtividadeRecente({ periodo }: { periodo: PeriodoSelecionado }) {
  const { unidadeSelecionadaId, unidades } = useUnidade();
  const [ordens, setOrdens] = React.useState<OrdemComContexto[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const periodoInicioMs = periodo.inicio.getTime();
  const periodoFimMs = periodo.fim.getTime();

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .gte("entrada_em", new Date(periodoInicioMs).toISOString())
        .lt("entrada_em", new Date(periodoFimMs).toISOString())
        .order("entrada_em", { ascending: false })
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

      const veiculoIds = [
        ...new Set(dadosOrdens.map((o) => o.veiculo_id).filter((id): id is string => !!id)),
      ];
      const osIds = dadosOrdens.map((o) => o.id);

      const [{ data: veiculos }, { data: itens }] = await Promise.all([
        veiculoIds.length
          ? supabase.from("veiculos").select("*").in("id", veiculoIds)
          : Promise.resolve({ data: [] as Veiculo[] }),
        supabase.from("os_itens").select("os_id, descricao").in("os_id", osIds),
      ]);
      if (cancelado) return;

      const veiculosMap = new Map((veiculos ?? []).map((v) => [v.id, v]));
      const unidadesMap = new Map(unidades.map((u) => [u.id, u.nome]));
      const itensPorOs = new Map<string, string[]>();
      for (const item of itens ?? []) {
        const lista = itensPorOs.get(item.os_id) ?? [];
        lista.push(item.descricao);
        itensPorOs.set(item.os_id, lista);
      }

      setOrdens(
        dadosOrdens.map((o) => {
          const servicos = itensPorOs.get(o.id) ?? [];
          return {
            ...o,
            veiculo: o.veiculo_id ? (veiculosMap.get(o.veiculo_id) ?? null) : null,
            unidadeNome: unidadesMap.get(o.unidade_id) ?? null,
            servicoLabel:
              servicos.length === 0
                ? "Sem serviços"
                : servicos.length === 1
                  ? servicos[0]
                  : `${servicos.length} serviços`,
          };
        })
      );
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId, unidades, periodoInicioMs, periodoFimMs]);

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Atividade recente ({periodo.label})</CardTitle>
        <CardAction>
          <Link href="/ordens" className="text-xs font-medium text-primary hover:underline">
            Ver todas as OS
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {carregando ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : ordens.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma OS lançada no período.</p>
        ) : (
          ordens.map((os, i) => {
            const veiculo = veiculoTexto(os.veiculo);
            return (
              <Link
                key={os.id}
                href={`/ordens/${os.id}`}
                className={`flex items-center gap-3 border-border px-4 py-3 transition-colors hover:bg-accent ${
                  i < ordens.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  OS
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    #{os.numero} · {os.servicoLabel}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[os.unidadeNome, veiculo, formatarData(os.entrada_em)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatarMoeda(os.valor_total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {os.status === "cancelado" ? "Cancelada" : STATUS_PAGAMENTO_CURTO[os.status_pagamento]}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
