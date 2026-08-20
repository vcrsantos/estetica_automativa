"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import type {
  Cliente,
  GerarPrestacaoPayload,
  OrdemServico,
  PrestacaoConta,
  PrestacaoStatus,
  Unidade,
} from "@/types/database";
import { ClienteBuscaRapida } from "@/components/clientes/cliente-busca-rapida";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

function formatarData(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function inicioMesIso() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
}

const STATUS_LABELS: Record<PrestacaoStatus, string> = {
  aberto: "Aberto",
  pago: "Pago",
  cancelado: "Cancelado",
};

const STATUS_BADGE_VARIANT: Record<PrestacaoStatus, "warning" | "success" | "destructive"> = {
  aberto: "warning",
  pago: "success",
  cancelado: "destructive",
};

const STATUS_FILTRO_ITENS = {
  todos: "Todos os status",
  aberto: "Aberto",
  vencido: "Vencido",
  pago: "Pago",
  cancelado: "Cancelado",
};

export function PrestacaoContasContent({
  unidades,
  unidadeFixaId,
}: {
  unidades: Unidade[];
  unidadeFixaId: string | null;
}) {
  const router = useRouter();

  // ---------- compositor ----------
  const [unidadeId, setUnidadeId] = React.useState(unidadeFixaId ?? unidades[0]?.id ?? "");
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [dataInicio, setDataInicio] = React.useState(inicioMesIso);
  const [dataFim, setDataFim] = React.useState(hojeIso);
  const [dataVencimento, setDataVencimento] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [osElegiveis, setOsElegiveis] = React.useState<OrdemServico[]>([]);
  const [carregandoOs, setCarregandoOs] = React.useState(false);
  const [selecionadas, setSelecionadas] = React.useState<Set<string>>(new Set());
  const [gerando, setGerando] = React.useState(false);

  const periodoValido = Boolean(dataInicio && dataFim && dataInicio <= dataFim);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!cliente || !periodoValido) {
        setOsElegiveis([]);
        setSelecionadas(new Set());
        return;
      }
      setCarregandoOs(true);
      const supabase = createClient();
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .select("*")
        .eq("cliente_id", cliente.id)
        .eq("unidade_id", unidadeId)
        .gte("entrada_em", `${dataInicio}T00:00:00`)
        .lte("entrada_em", `${dataFim}T23:59:59`)
        .order("entrada_em", { ascending: true });

      if (cancelado) return;

      if (error) {
        toast.error(`Não foi possível buscar os serviços: ${error.message}`);
        setOsElegiveis([]);
        setSelecionadas(new Set());
        setCarregandoOs(false);
        return;
      }

      const osIds = (os ?? []).map((o) => o.id);
      const [{ data: vinculosPrestacao }, { data: vinculosRecibo }] = osIds.length
        ? await Promise.all([
            supabase.from("prestacao_conta_item").select("os_id").in("os_id", osIds).eq("ativo", true),
            supabase.from("recibo_os").select("os_id").in("os_id", osIds).eq("ativo", true),
          ])
        : [{ data: [] as { os_id: string }[] }, { data: [] as { os_id: string }[] }];

      if (cancelado) return;
      const jaFaturadas = new Set([
        ...(vinculosPrestacao ?? []).map((v) => v.os_id),
        ...(vinculosRecibo ?? []).map((v) => v.os_id),
      ]);
      const disponiveis = (os ?? []).filter((o) => !jaFaturadas.has(o.id));
      const concluidasENaoPagas = disponiveis.filter(
        (o) => (o.status === "finalizado" || o.status === "entregue") && o.status_pagamento !== "pago"
      );
      setOsElegiveis(disponiveis);
      setSelecionadas(new Set(concluidasENaoPagas.map((o) => o.id)));
      setCarregandoOs(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [cliente, unidadeId, dataInicio, dataFim, periodoValido]);

  function selecionarCliente(c: Cliente) {
    setCliente(c);
    setTelefone(c.telefone ?? "");
    setDocumento(c.documento ?? "");
  }

  function alternarSelecao(osId: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(osId)) proximo.delete(osId);
      else proximo.add(osId);
      return proximo;
    });
  }

  function alternarTodas() {
    setSelecionadas((atual) =>
      atual.size === osElegiveis.length ? new Set() : new Set(osElegiveis.map((o) => o.id))
    );
  }

  const totalSelecionado = osElegiveis
    .filter((o) => selecionadas.has(o.id))
    .reduce((acc, o) => acc + o.valor_total, 0);

  async function gerar() {
    if (!unidadeId || !cliente) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!periodoValido) {
      toast.error("Período inválido.");
      return;
    }
    if (selecionadas.size === 0) {
      toast.error("Selecione ao menos um serviço.");
      return;
    }

    const payload: GerarPrestacaoPayload = {
      unidade_id: unidadeId,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      telefone: telefone.trim() || null,
      documento: documento.trim() || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      data_vencimento: dataVencimento || null,
      observacoes: observacoes.trim() || null,
      os_ids: Array.from(selecionadas),
    };

    setGerando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("gerar_prestacao_conta", { payload });
    setGerando(false);

    if (error || !data) {
      toast.error(error?.message ?? "Não foi possível gerar a prestação de contas.");
      return;
    }

    toast.success(`Prestação ${data.numero} gerada.`);
    router.push(`/prestacao-contas/${data.id}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prestação de contas</h1>
        <p className="text-muted-foreground">
          Reúna os serviços concluídos e ainda não pagos de um cliente num único documento de
          cobrança.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova prestação de contas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unidadeFixaId === null && unidades.length > 1 && (
              <div className="flex flex-col gap-2">
                <Label>Unidade</Label>
                <Select
                  items={Object.fromEntries(unidades.map((u) => [u.id, u.nome]))}
                  value={unidadeId}
                  onValueChange={(v) => v && setUnidadeId(v as string)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <Label>Cliente</Label>
              <ClienteBuscaRapida onSelecionar={selecionarCliente} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Início do período</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fim do período</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Vencimento (opcional)</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>CPF/CNPJ</Label>
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
          </div>

          {cliente && !periodoValido && (
            <p className="text-sm text-destructive">A data inicial deve ser anterior ou igual à final.</p>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex flex-col gap-2 rounded-md border">
              <div className="flex items-center justify-between border-b p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={osElegiveis.length > 0 && selecionadas.size === osElegiveis.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selecionadas.size > 0 && selecionadas.size < osElegiveis.length;
                      }
                    }}
                    onChange={alternarTodas}
                    disabled={osElegiveis.length === 0}
                  />
                  Selecionar todos
                </label>
                <span className="text-xs text-muted-foreground">
                  {!cliente
                    ? "Selecione uma empresa para consultar"
                    : carregandoOs
                      ? "Carregando..."
                      : osElegiveis.length === 0
                        ? "Nenhum serviço disponível para este período"
                        : `${osElegiveis.length} encontrado(s) · ${selecionadas.size} selecionado(s)`}
                </span>
              </div>

              <div className="flex max-h-[424px] flex-col gap-1 overflow-y-auto p-2">
                {osElegiveis.map((os) => (
                  <label
                    key={os.id}
                    className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selecionadas.has(os.id)}
                      onChange={() => alternarSelecao(os.id)}
                    />
                    <span className="w-20 shrink-0 text-muted-foreground">
                      {new Date(os.entrada_em).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="flex-1">OS #{os.numero}</span>
                    <Badge variant="outline">{STATUS_OS_LABELS[os.status]}</Badge>
                    {os.status !== "cancelado" && <StatusPagamentoBadge status={os.status_pagamento} />}
                    <span className="w-24 shrink-0 text-right font-medium">
                      {formatarMoeda(os.valor_total)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Card className="h-fit lg:sticky lg:top-4">
              <CardContent className="flex flex-col gap-2 py-4 text-sm">
                <h3 className="font-semibold">{cliente?.nome ?? "Nenhuma empresa selecionada"}</h3>
                <p>
                  <span className="text-muted-foreground">Período: </span>
                  {periodoValido ? `${formatarData(dataInicio)} a ${formatarData(dataFim)}` : "Período inválido"}
                </p>
                <p>
                  <span className="text-muted-foreground">Serviços: </span>
                  {selecionadas.size}
                </p>
                <p className="text-base font-semibold">
                  Total: <span className="text-primary">{formatarMoeda(totalSelecionado)}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>

          <Button
            className="w-fit"
            disabled={gerando || !cliente || !periodoValido || selecionadas.size === 0}
            onClick={gerar}
          >
            {gerando && <Loader2 className="size-4 animate-spin" />}
            Gerar prestação de contas
          </Button>
        </CardContent>
      </Card>

      <HistoricoPrestacoes />
    </div>
  );
}

function HistoricoPrestacoes() {
  const { unidadeSelecionadaId } = useUnidade();
  const [prestacoes, setPrestacoes] = React.useState<PrestacaoConta[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [busca, setBusca] = React.useState("");
  const [statusFiltro, setStatusFiltro] = React.useState<keyof typeof STATUS_FILTRO_ITENS>("todos");

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();
      let query = supabase.from("prestacao_conta").select("*").order("criado_em", { ascending: false });

      if (unidadeSelecionadaId) query = query.eq("unidade_id", unidadeSelecionadaId);
      if (statusFiltro === "vencido") {
        query = query.eq("status", "aberto").lt("data_vencimento", hojeIso());
      } else if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }

      const { data } = await query;
      if (!cancelado) {
        setPrestacoes(data ?? []);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId, statusFiltro]);

  const termoNormalizado = busca.trim().toLowerCase();
  const filtradas = termoNormalizado
    ? prestacoes.filter(
        (p) =>
          p.cliente_nome.toLowerCase().includes(termoNormalizado) ||
          p.numero.toLowerCase().includes(termoNormalizado) ||
          (p.documento ?? "").toLowerCase().includes(termoNormalizado)
      )
    : prestacoes;

  const totalAberto = prestacoes.filter((p) => p.status === "aberto").reduce((acc, p) => acc + p.valor_total, 0);
  const totalPago = prestacoes.filter((p) => p.status === "pago").reduce((acc, p) => acc + p.valor_total, 0);

  function vencida(p: PrestacaoConta) {
    return p.status === "aberto" && p.data_vencimento && p.data_vencimento < hojeIso();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Relatórios e recibos</h2>
        <p className="text-muted-foreground">Histórico financeiro corporativo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase">Em aberto</p>
            <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
              {formatarMoeda(totalAberto)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase">Pago</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {formatarMoeda(totalPago)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground uppercase">Documentos</p>
            <p className="text-xl font-semibold">{prestacoes.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, número ou documento"
          className="max-w-xs"
        />
        <Select
          items={STATUS_FILTRO_ITENS}
          value={statusFiltro}
          onValueChange={(v) => v && setStatusFiltro(v as keyof typeof STATUS_FILTRO_ITENS)}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Período</TableHead>
              <TableHead className="hidden sm:table-cell">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              filtradas.map((p) => (
                <TableRow key={p.id} className={p.status === "cancelado" ? "opacity-60" : ""}>
                  <TableCell>
                    <Link
                      href={`/prestacao-contas/${p.id}`}
                      className={`font-medium hover:underline ${p.status === "cancelado" ? "line-through" : ""}`}
                    >
                      {p.numero}
                    </Link>
                  </TableCell>
                  <TableCell>{p.cliente_nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatarMoeda(p.valor_total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={STATUS_BADGE_VARIANT[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                      {vencida(p) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="size-3" />
                          Vencida
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
