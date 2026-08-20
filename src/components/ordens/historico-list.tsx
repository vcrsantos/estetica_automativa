"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, StatusOs, Veiculo } from "@/types/database";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";
import { CancelarOsDialog } from "@/components/ordens/cancelar-os-dialog";
import { GerarReciboRapidoDialog } from "@/components/ordens/gerar-recibo-rapido-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_BADGE_VARIANT: Record<StatusOs, "info" | "outline" | "destructive" | "success"> = {
  agendado: "outline",
  em_execucao: "info",
  finalizado: "success",
  entregue: "success",
  cancelado: "destructive",
};

const TAMANHO_PAGINA = 30;

function dataInicioPadrao() {
  const data = new Date();
  data.setDate(data.getDate() - 30);
  return data.toISOString().slice(0, 10);
}

function hojeIso() {
  const agora = new Date();
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return semFuso.toISOString().slice(0, 10);
}

export function HistoricoList() {
  const { unidadeSelecionadaId } = useUnidade();
  const [dataInicio, setDataInicio] = React.useState(dataInicioPadrao());
  const [dataFim, setDataFim] = React.useState(hojeIso());
  const [statusFiltro, setStatusFiltro] = React.useState<StatusOs | "todos">("todos");
  const [busca, setBusca] = React.useState("");

  const [ordens, setOrdens] = React.useState<OrdemServico[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [veiculos, setVeiculos] = React.useState<Map<string, Veiculo>>(new Map());
  const [osParaCancelar, setOsParaCancelar] = React.useState<OrdemServico | null>(null);
  const [osParaRecibo, setOsParaRecibo] = React.useState<OrdemServico | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [temMais, setTemMais] = React.useState(false);
  const [pagina, setPagina] = React.useState(0);

  const carregar = React.useCallback(
    async (paginaAlvo: number, substituir: boolean) => {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .gte("entrada_em", `${dataInicio}T00:00:00`)
        .lte("entrada_em", `${dataFim}T23:59:59`)
        .order("entrada_em", { ascending: false })
        .range(paginaAlvo * TAMANHO_PAGINA, paginaAlvo * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }
      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }

      const { data: lista } = await query;
      const linhas = lista ?? [];

      const clienteIds = [...new Set(linhas.map((o) => o.cliente_id))];
      const veiculoIds = [...new Set(linhas.map((o) => o.veiculo_id).filter((id): id is string => !!id))];

      const [{ data: clientesData }, { data: veiculosData }] = await Promise.all([
        clienteIds.length
          ? supabase.from("clientes").select("*").in("id", clienteIds)
          : Promise.resolve({ data: [] as Cliente[] }),
        veiculoIds.length
          ? supabase.from("veiculos").select("*").in("id", veiculoIds)
          : Promise.resolve({ data: [] as Veiculo[] }),
      ]);

      setOrdens((atual) => (substituir ? linhas : [...atual, ...linhas]));
      setClientes((atual) => {
        const novo = new Map(substituir ? [] : atual);
        for (const c of clientesData ?? []) novo.set(c.id, c);
        return novo;
      });
      setVeiculos((atual) => {
        const novo = new Map(substituir ? [] : atual);
        for (const v of veiculosData ?? []) novo.set(v.id, v);
        return novo;
      });
      setTemMais(linhas.length === TAMANHO_PAGINA);
      setPagina(paginaAlvo);
      setCarregando(false);
    },
    [dataInicio, dataFim, statusFiltro, unidadeSelecionadaId]
  );

  React.useEffect(() => {
    // Recarrega sempre que período/status/unidade mudarem — sincronização
    // com dado externo (banco), não é possível derivar isso durante o render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar(0, true);
  }, [carregar]);

  const termoBusca = busca.trim().toLowerCase();
  const ordensFiltradas = termoBusca
    ? ordens.filter((os) => {
        const cliente = clientes.get(os.cliente_id);
        const veiculo = os.veiculo_id ? veiculos.get(os.veiculo_id) : null;
        return (
          cliente?.nome.toLowerCase().includes(termoBusca) ||
          cliente?.telefone?.includes(termoBusca) ||
          veiculo?.placa?.toLowerCase().includes(termoBusca)
        );
      })
    : ordens;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico de serviços</h1>
          <p className="text-muted-foreground">Todas as ordens de serviço, incluindo entregues e canceladas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/fila-do-dia" />} nativeButton={false}>
            <ArrowLeft className="size-4" />
            Voltar para a fila do dia
          </Button>
          <Button variant="gradient" render={<Link href="/ordens/novo" />} nativeButton={false}>
            <Plus className="size-4" />
            Nova OS
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            items={{ todos: "Todos os status", ...STATUS_OS_LABELS }}
            value={statusFiltro}
            onValueChange={(v) => setStatusFiltro((v as StatusOs | "todos") ?? "todos")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_OS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-48">
          <label className="text-xs text-muted-foreground">Buscar (nesta página)</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, telefone ou placa"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Veículo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && pagina === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && ordensFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma OS encontrada no período.
                </TableCell>
              </TableRow>
            )}

            {ordensFiltradas.map((os) => {
              const cliente = clientes.get(os.cliente_id);
              const veiculo = os.veiculo_id ? veiculos.get(os.veiculo_id) : null;
              return (
                <TableRow key={os.id}>
                  <TableCell>
                    <Link href={`/ordens/${os.id}`} className="font-medium hover:underline">
                      #{os.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(os.entrada_em).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{cliente?.nome ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {veiculo ? veiculo.placa || veiculo.modelo || "—" : "Sem veículo"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[os.status]}>{STATUS_OS_LABELS[os.status]}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {os.status !== "cancelado" && <StatusPagamentoBadge status={os.status_pagamento} />}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {os.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar OS"
                        render={<Link href={`/ordens/${os.id}`} />}
                        nativeButton={false}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Gerar recibo"
                        disabled={os.status === "cancelado"}
                        onClick={() => setOsParaRecibo(os)}
                      >
                        <FileText className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir OS"
                        disabled={os.status === "cancelado"}
                        onClick={() => setOsParaCancelar(os)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {temMais && (
        <Button variant="outline" disabled={carregando} onClick={() => carregar(pagina + 1, false)} className="self-center">
          Carregar mais
        </Button>
      )}

      <CancelarOsDialog
        os={osParaCancelar}
        onOpenChange={(open) => !open && setOsParaCancelar(null)}
        onCancelada={() => carregar(0, true)}
      />
      <GerarReciboRapidoDialog
        os={osParaRecibo}
        cliente={osParaRecibo ? (clientes.get(osParaRecibo.cliente_id) ?? null) : null}
        veiculo={osParaRecibo?.veiculo_id ? (veiculos.get(osParaRecibo.veiculo_id) ?? null) : null}
        onOpenChange={(open) => !open && setOsParaRecibo(null)}
      />
    </div>
  );
}
