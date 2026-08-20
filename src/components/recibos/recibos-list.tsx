"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { calcularPeriodo, type PeriodoId } from "@/lib/dashboard-periodo";
import { SeletorPeriodo } from "@/components/dashboard/seletor-periodo";
import type { Cliente, Recibo, ReciboStatus, ReciboTipo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_LABELS: Record<ReciboStatus, string> = { emitido: "Emitido", cancelado: "Cancelado" };
const STATUS_BADGE_VARIANT: Record<ReciboStatus, "success" | "destructive"> = {
  emitido: "success",
  cancelado: "destructive",
};
const TIPO_LABELS: Record<ReciboTipo, string> = {
  quitacao: "Quitação",
  sinal: "Sinal",
  parcial: "Parcial",
};
const STATUS_FILTRO_ITENS = { todos: "Todos os status", emitido: "Emitido", cancelado: "Cancelado" };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RecibosList({ isAdmin }: { isAdmin: boolean }) {
  const { unidadeSelecionadaId } = useUnidade();
  const [recibos, setRecibos] = React.useState<Recibo[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [carregando, setCarregando] = React.useState(true);
  const [statusFiltro, setStatusFiltro] = React.useState<ReciboStatus | "todos">("todos");
  const [periodoId, setPeriodoId] = React.useState<PeriodoId>("mes");
  const [personalizado, setPersonalizado] = React.useState({ inicio: hojeIso(), fim: hojeIso() });

  const periodo = React.useMemo(
    () => calcularPeriodo(periodoId, personalizado),
    [periodoId, personalizado]
  );
  const periodoInicioMs = periodo.inicio.getTime();
  const periodoFimMs = periodo.fim.getTime();

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("recibo")
        .select("*")
        .gte("data_emissao", new Date(periodoInicioMs).toISOString())
        .lte("data_emissao", new Date(periodoFimMs).toISOString())
        .order("data_emissao", { ascending: false });

      if (unidadeSelecionadaId) query = query.eq("unidade_id", unidadeSelecionadaId);
      if (statusFiltro !== "todos") query = query.eq("status", statusFiltro);

      const { data: lista } = await query;
      if (cancelado || !lista) return;

      const clienteIds = [...new Set(lista.map((r) => r.cliente_id).filter((id): id is string => !!id))];
      const { data: clientesData } = clienteIds.length
        ? await supabase.from("clientes").select("*").in("id", clienteIds)
        : { data: [] as Cliente[] };

      if (cancelado) return;
      setRecibos(lista);
      setClientes(new Map((clientesData ?? []).map((c) => [c.id, c])));
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId, statusFiltro, periodoInicioMs, periodoFimMs]);

  const totalPeriodo = recibos
    .filter((r) => r.status === "emitido")
    .reduce((acc, r) => acc + r.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recibos</h1>
          <p className="text-muted-foreground">
            Recibo de prestação de serviço — não é nota fiscal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              render={<Link href="/recibos/configuracao" />}
              nativeButton={false}
            >
              <Settings2 className="size-4" />
              Configurar emitente
            </Button>
          )}
          <Button render={<Link href="/recibos/novo" />} nativeButton={false}>
            <Plus className="size-4" />
            Emitir recibo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeletorPeriodo
            periodoId={periodoId}
            onPeriodoIdChange={setPeriodoId}
            personalizado={personalizado}
            onPersonalizadoChange={setPersonalizado}
            periodo={periodo}
          />
          <Select
            items={STATUS_FILTRO_ITENS}
            value={statusFiltro}
            onValueChange={(v) => setStatusFiltro((v as ReciboStatus | "todos") ?? "todos")}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_FILTRO_ITENS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Total emitido no período: <span className="font-semibold text-foreground">{formatarMoeda(totalPeriodo)}</span>
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden sm:table-cell">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && recibos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum recibo emitido neste período.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              recibos.map((recibo) => {
                const cliente = recibo.cliente_id ? clientes.get(recibo.cliente_id) : null;
                const nome = cliente?.nome ?? recibo.tomador_snapshot.nome_exibicao;
                return (
                  <TableRow key={recibo.id} className={recibo.status === "cancelado" ? "opacity-60" : ""}>
                    <TableCell>
                      <Link
                        href={`/recibos/${recibo.id}`}
                        className={`font-medium hover:underline ${recibo.status === "cancelado" ? "line-through" : ""}`}
                        title={recibo.status === "cancelado" ? (recibo.motivo_cancelamento ?? "") : undefined}
                      >
                        {recibo.serie}-{String(recibo.numero).padStart(6, "0")}
                      </Link>
                    </TableCell>
                    <TableCell>{nome}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {new Date(recibo.data_emissao).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{TIPO_LABELS[recibo.tipo]}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatarMoeda(recibo.valor)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[recibo.status]}>
                        {STATUS_LABELS[recibo.status]}
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
