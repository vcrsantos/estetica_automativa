"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  History,
  Play,
  Plus,
  PlayCircle,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, StatusOs, Veiculo } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";

type EtapaConfig = {
  status: StatusOs;
  titulo: string;
  icon: typeof Calendar;
  cor: string;
  corSuave: string;
  corTexto: string;
  vazioTitulo: string;
  vazioTexto: string;
};

const ETAPAS: EtapaConfig[] = [
  {
    status: "agendado",
    titulo: "Agendado",
    icon: Calendar,
    cor: "#F5B800",
    corSuave: "#FFF8DC",
    corTexto: "#835F00",
    vazioTitulo: "Agenda livre",
    vazioTexto: "Novas OS aparecerão aqui.",
  },
  {
    status: "em_execucao",
    titulo: "Em execução",
    icon: PlayCircle,
    cor: "#2D72E8",
    corSuave: "#EDF4FF",
    corTexto: "#1D56AD",
    vazioTitulo: "Nenhum serviço em andamento",
    vazioTexto: "Inicie uma OS agendada.",
  },
  {
    status: "finalizado",
    titulo: "Finalizado",
    icon: CheckCircle2,
    cor: "#20A36A",
    corSuave: "#EAF8F1",
    corTexto: "#16764C",
    vazioTitulo: "Nenhum serviço finalizado",
    vazioTexto: "As entregas concluídas aparecerão aqui.",
  },
];

const ETAPA_POR_STATUS = Object.fromEntries(ETAPAS.map((e) => [e.status, e])) as Record<
  StatusOs,
  EtapaConfig
>;

/** Próxima etapa e etapa anterior de cada status — usadas pelos botões Iniciar/Finalizar/Voltar e pelo arrastar-e-soltar. */
const PROXIMA_ETAPA: Partial<Record<StatusOs, { status: StatusOs; label: string; icon: typeof Calendar }>> = {
  agendado: { status: "em_execucao", label: "Iniciar", icon: Play },
  em_execucao: { status: "finalizado", label: "Finalizar", icon: CheckCircle2 },
};
const ETAPA_ANTERIOR: Partial<Record<StatusOs, StatusOs>> = {
  em_execucao: "agendado",
  finalizado: "em_execucao",
};

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

  async function alterarStatus(os: OrdemServico, novoStatus: StatusOs) {
    setAlterandoId(os.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({ status: novoStatus })
      .eq("id", os.id)
      .select("*")
      .single();
    setAlterandoId(null);

    if (error || !data) {
      toast.error(`Não foi possível atualizar a OS #${os.numero}. Ela continua em ${STATUS_OS_LABELS[os.status]}.`);
      return;
    }
    setOrdens((atual) => atual.map((o) => (o.id === os.id ? data : o)));
    toast.success(`OS #${os.numero} movida para ${STATUS_OS_LABELS[novoStatus]}.`);
  }

  function aoSoltarNaColuna(evento: React.DragEvent<HTMLDivElement>, status: StatusOs) {
    evento.preventDefault();
    setColunaArrastandoSobre(null);
    const osId = evento.dataTransfer.getData("text/plain");
    if (!osId) return;
    const os = ordens.find((o) => o.id === osId);
    if (!os || os.status === status) return;
    alterarStatus(os, status);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Operação de hoje
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Fila do dia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize o andamento das OS e atualize cada etapa com um clique.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
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

      <div className="grid gap-4 md:grid-cols-3">
        {ETAPAS.map((etapa) => {
          const ordensDaEtapa = ordens.filter((o) => o.status === etapa.status);
          const Icon = etapa.icon;

          return (
            <div
              key={etapa.status}
              className={cn(
                "flex flex-col gap-3 rounded-[14px] border-t-[3px] p-3 transition-colors"
              )}
              style={{
                borderTopColor: etapa.cor,
                backgroundColor:
                  colunaArrastandoSobre === etapa.status ? etapa.corSuave : "color-mix(in srgb, " + etapa.corSuave + " 55%, var(--card))",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (colunaArrastandoSobre !== etapa.status) setColunaArrastandoSobre(etapa.status);
              }}
              onDragLeave={() => setColunaArrastandoSobre(null)}
              onDrop={(e) => aoSoltarNaColuna(e, etapa.status)}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: etapa.corSuave, color: etapa.corTexto }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <h2 className="text-sm font-semibold" style={{ color: etapa.corTexto }}>
                    {etapa.titulo}
                  </h2>
                </div>
                <span
                  className="num rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: etapa.cor }}
                >
                  {ordensDaEtapa.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {carregando &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}

                {!carregando && ordensDaEtapa.length === 0 && (
                  <div className="flex flex-col items-center gap-1 rounded-[12px] border border-dashed border-border/70 bg-card/50 py-6 text-center">
                    <Icon className="size-5" style={{ color: etapa.cor }} />
                    <p className="text-sm font-medium">{etapa.vazioTitulo}</p>
                    <p className="text-xs text-muted-foreground">{etapa.vazioTexto}</p>
                  </div>
                )}

                {!carregando &&
                  ordensDaEtapa.map((os) => {
                    const cliente = clientes.get(os.cliente_id);
                    const veiculo = os.veiculo_id ? veiculos.get(os.veiculo_id) : null;
                    const proxima = PROXIMA_ETAPA[os.status];
                    const anterior = ETAPA_ANTERIOR[os.status];
                    const corProxima = proxima ? ETAPA_POR_STATUS[proxima.status] : null;
                    const desabilitado = alterandoId === os.id;

                    return (
                      <Link
                        key={os.id}
                        href={`/ordens/${os.id}`}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", os.id)}
                      >
                        <Card
                          className="cursor-grab gap-0 rounded-[12px] border-l-4 bg-card py-0 shadow-[0_8px_26px_rgba(25,26,24,0.07)] transition-colors hover:bg-accent/40 active:cursor-grabbing"
                          style={{ borderLeftColor: etapa.cor }}
                        >
                          <CardContent className="flex flex-col gap-2 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className="truncate font-medium">{cliente?.nome ?? "Cliente"}</span>
                              <span className="num shrink-0 text-xs text-muted-foreground">
                                #{os.numero}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                <Car className="size-3.5 shrink-0" />
                                <span className="truncate">
                                  {veiculo ? veiculo.placa || veiculo.modelo || "Veículo" : "Sem veículo"}
                                </span>
                              </span>
                              <span className="num shrink-0 font-medium">
                                {os.valor_total.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="size-3.5 shrink-0" />
                              <span className="num">
                                {new Date(os.entrada_em).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <StatusPagamentoBadge status={os.status_pagamento} />

                            <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                              <span
                                className="flex items-center gap-1.5 text-xs font-medium"
                                style={{ color: etapa.corTexto }}
                              >
                                <span
                                  className="size-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: etapa.cor }}
                                />
                                {STATUS_OS_LABELS[os.status]}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {anterior && (
                                  <button
                                    type="button"
                                    disabled={desabilitado}
                                    aria-label={`Voltar OS #${os.numero} para ${STATUS_OS_LABELS[anterior]}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      alterarStatus(os, anterior);
                                    }}
                                    className="flex items-center gap-1 rounded-full border-2 border-muted-foreground/35 bg-muted-foreground/5 px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted-foreground/10 disabled:opacity-50"
                                  >
                                    <Undo2 className="size-3.5" />
                                    Voltar
                                  </button>
                                )}

                                {proxima && corProxima ? (
                                  <button
                                    type="button"
                                    disabled={desabilitado}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      alterarStatus(os, proxima.status);
                                    }}
                                    className="flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                                    style={{ borderColor: corProxima.cor, backgroundColor: `${corProxima.cor}1f`, color: corProxima.cor }}
                                  >
                                    <proxima.icon className="size-3.5" />
                                    {proxima.label}
                                  </button>
                                ) : (
                                  <span
                                    className="flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-semibold"
                                    style={{ borderColor: etapa.cor, backgroundColor: `${etapa.cor}1f`, color: etapa.cor }}
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                    Concluída
                                  </span>
                                )}
                              </div>
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
