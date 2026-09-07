"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  PlayCircle,
  Plus,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, OsItem, StatusOs, Veiculo } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Mesma paleta semântica da Fila do dia e do detalhe da OS — agora cobrindo
 * todo o histórico (entregue/cancelado incluídos, não só as 3 etapas ativas). */
const CORES: Record<
  StatusOs,
  { cor: string; corSuave: string; corTexto: string; icon: typeof CalendarIcon }
> = {
  agendado: { cor: "#F5B800", corSuave: "#FFF8DC", corTexto: "#835F00", icon: CalendarClock },
  em_execucao: { cor: "#2D72E8", corSuave: "#EDF4FF", corTexto: "#1D56AD", icon: PlayCircle },
  finalizado: { cor: "#20A36A", corSuave: "#EAF8F1", corTexto: "#16764C", icon: CheckCircle2 },
  entregue: { cor: "#20A36A", corSuave: "#EAF8F1", corTexto: "#16764C", icon: PackageCheck },
  cancelado: { cor: "#D73C3C", corSuave: "#FFF0F0", corTexto: "#AD2929", icon: XCircle },
};

const ORDEM_STATUS: Record<StatusOs, number> = {
  em_execucao: 0,
  agendado: 1,
  finalizado: 2,
  entregue: 3,
  cancelado: 4,
};

/** Mesma ordem de exibição do filtro de status. */
const TODOS_STATUS: StatusOs[] = ["agendado", "em_execucao", "finalizado", "entregue", "cancelado"];

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

type Visao = "mes" | "semana" | "dia";

function inicioDoDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function adicionarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mesmoDia(a: Date, b: Date) {
  return chaveDia(a) === chaveDia(b);
}
function inicioSemana(d: Date) {
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  return adicionarDias(inicioDoDia(d), diff);
}
function inicioMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fimMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Grade do mês: sempre começa numa segunda e termina num domingo, cobrindo o mês inteiro. */
function diasDaGradeDoMes(referencia: Date) {
  const inicio = inicioSemana(inicioMes(referencia));
  const fimDoMes = fimMes(referencia);
  const fim = adicionarDias(inicioSemana(fimDoMes), 6);
  const dias: Date[] = [];
  for (let d = inicio; d <= fim; d = adicionarDias(d, 1)) {
    dias.push(d);
  }
  return dias;
}

function diasDaSemana(referencia: Date) {
  const inicio = inicioSemana(referencia);
  return Array.from({ length: 7 }, (_, i) => adicionarDias(inicio, i));
}

export function AgendaCalendar() {
  const { unidadeSelecionadaId } = useUnidade();
  const [visao, setVisao] = React.useState<Visao>("mes");
  const [referencia, setReferencia] = React.useState(() => inicioDoDia(new Date()));
  const [diaSelecionado, setDiaSelecionado] = React.useState<Date | null>(() => inicioDoDia(new Date()));
  const [ordens, setOrdens] = React.useState<OrdemServico[]>([]);
  const [clientes, setClientes] = React.useState<Map<string, Cliente>>(new Map());
  const [veiculos, setVeiculos] = React.useState<Map<string, Veiculo>>(new Map());
  const [descricoesPorOs, setDescricoesPorOs] = React.useState<Map<string, string[]>>(new Map());
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState(false);
  const [osDetalhe, setOsDetalhe] = React.useState<OrdemServico | null>(null);
  const [statusFiltrados, setStatusFiltrados] = React.useState<Set<StatusOs>>(
    () => new Set(TODOS_STATUS)
  );

  function alternarStatusFiltro(status: StatusOs) {
    setStatusFiltrados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(status)) proximo.delete(status);
      else proximo.add(status);
      return proximo;
    });
  }

  const dias = React.useMemo(() => {
    if (visao === "dia") return [referencia];
    if (visao === "semana") return diasDaSemana(referencia);
    return diasDaGradeDoMes(referencia);
  }, [visao, referencia]);

  const rangeInicio = dias[0];
  const rangeFim = adicionarDias(dias[dias.length - 1], 1);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(false);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .in("status", [...statusFiltrados])
        .gte("entrada_em", rangeInicio.toISOString())
        .lt("entrada_em", rangeFim.toISOString())
        .order("entrada_em", { ascending: true });

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { data: os, error } = await query;
      if (cancelado) return;

      if (error || !os) {
        setErro(true);
        setCarregando(false);
        return;
      }

      const clienteIds = [...new Set(os.map((o) => o.cliente_id))];
      const veiculoIds = [...new Set(os.map((o) => o.veiculo_id).filter((id): id is string => !!id))];
      const osIds = os.map((o) => o.id);

      const [{ data: clientesData }, { data: veiculosData }, { data: itensData }] = await Promise.all([
        clienteIds.length
          ? supabase.from("clientes").select("*").in("id", clienteIds)
          : Promise.resolve({ data: [] as Cliente[] }),
        veiculoIds.length
          ? supabase.from("veiculos").select("*").in("id", veiculoIds)
          : Promise.resolve({ data: [] as Veiculo[] }),
        osIds.length
          ? supabase.from("os_itens").select("*").in("os_id", osIds)
          : Promise.resolve({ data: [] as OsItem[] }),
      ]);

      if (cancelado) return;

      const descricoes = new Map<string, string[]>();
      for (const item of itensData ?? []) {
        const atual = descricoes.get(item.os_id) ?? [];
        atual.push(item.descricao);
        descricoes.set(item.os_id, atual);
      }

      setOrdens(os);
      setClientes(new Map((clientesData ?? []).map((c) => [c.id, c])));
      setVeiculos(new Map((veiculosData ?? []).map((v) => [v.id, v])));
      setDescricoesPorOs(descricoes);
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [rangeInicio.getTime(), rangeFim.getTime(), unidadeSelecionadaId, statusFiltrados]);

  const ordensPorDia = React.useMemo(() => {
    const mapa = new Map<string, OrdemServico[]>();
    for (const os of ordens) {
      const chave = chaveDia(new Date(os.entrada_em));
      const lista = mapa.get(chave) ?? [];
      lista.push(os);
      mapa.set(chave, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => {
        const diff = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status];
        if (diff !== 0) return diff;
        return new Date(a.entrada_em).getTime() - new Date(b.entrada_em).getTime();
      });
    }
    return mapa;
  }, [ordens]);

  function irPara(delta: number) {
    if (visao === "mes") {
      setReferencia((r) => new Date(r.getFullYear(), r.getMonth() + delta, 1));
    } else if (visao === "semana") {
      setReferencia((r) => adicionarDias(r, delta * 7));
    } else {
      setReferencia((r) => adicionarDias(r, delta));
    }
  }

  function irParaHoje() {
    const hoje = inicioDoDia(new Date());
    setReferencia(hoje);
    setDiaSelecionado(hoje);
  }

  function selecionarDiaEVerDetalhes(dia: Date) {
    setDiaSelecionado(dia);
    setReferencia(dia);
    setVisao("dia");
  }

  const tituloPeriodo = React.useMemo(() => {
    if (visao === "dia") {
      return referencia.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    if (visao === "semana") {
      const inicio = inicioSemana(referencia);
      const fim = adicionarDias(inicio, 6);
      const mesmoMes = inicio.getMonth() === fim.getMonth();
      return mesmoMes
        ? `${inicio.getDate()} – ${fim.getDate()} de ${MESES[inicio.getMonth()]}`
        : `${inicio.getDate()} de ${MESES[inicio.getMonth()]} – ${fim.getDate()} de ${MESES[fim.getMonth()]}`;
    }
    return `${MESES[referencia.getMonth()]} de ${referencia.getFullYear()}`;
  }, [visao, referencia]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground capitalize md:hidden">
            {inicioDoDia(new Date()).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className="hidden text-sm text-muted-foreground md:block">
            Organize os serviços por dia, sem horários fixos.
          </p>
        </div>
        <Link
          href="/ordens/novo"
          aria-label="Nova ordem de serviço"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-cta)] text-[#101314] shadow-sm transition-transform active:scale-95 md:hidden"
        >
          <Plus className="size-5" />
        </Link>
      </div>

      {/* Desktop: uma única linha (Hoje/setas/título + segmentado). */}
      <div className="hidden items-center justify-between gap-3 rounded-[18px] border border-border bg-card p-3 shadow-[0_10px_30px_rgba(22,22,22,0.06)] md:flex">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Período anterior" onClick={() => irPara(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Próximo período" onClick={() => irPara(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <p className="num text-sm font-semibold capitalize" aria-live="polite">
            {tituloPeriodo}
          </p>
        </div>

        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(["mes", "semana", "dia"] as Visao[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisao(v)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                visao === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: título+setas numa linha, segmentado+Hoje na linha de baixo. */}
      <div className="flex flex-col gap-2 rounded-[18px] border border-border bg-card p-3 shadow-[0_10px_30px_rgba(22,22,22,0.06)] md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Período anterior" onClick={() => irPara(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="num text-sm font-semibold capitalize" aria-live="polite">
            {tituloPeriodo}
          </p>
          <Button variant="ghost" size="icon-sm" aria-label="Próximo período" onClick={() => irPara(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["mes", "semana", "dia"] as Visao[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisao(v)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  visao === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={irParaHoje}
            className="rounded-full bg-[image:var(--gradient-cta)] px-3 py-1 text-xs font-semibold text-[#101314]"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Mostrar:</span>
        {TODOS_STATUS.map((status) => {
          const config = CORES[status];
          const ativo = statusFiltrados.has(status);
          return (
            <button
              key={status}
              type="button"
              aria-pressed={ativo}
              onClick={() => alternarStatusFiltro(status)}
              className={cn(
                "rounded-full border-2 px-2.5 py-1 text-xs font-medium transition-opacity",
                !ativo && "opacity-40"
              )}
              style={{ borderColor: config.cor, backgroundColor: `${config.cor}1f`, color: config.corTexto }}
            >
              {STATUS_OS_LABELS[status]}
            </button>
          );
        })}
      </div>

      {erro ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium">A agenda não pôde ser carregada.</p>
          <Button variant="outline" size="sm" onClick={() => setReferencia((r) => new Date(r))}>
            Tentar de novo
          </Button>
        </div>
      ) : visao === "dia" ? (
        <VisaoDia
          dia={referencia}
          ordens={ordensPorDia.get(chaveDia(referencia)) ?? []}
          carregando={carregando}
          clientes={clientes}
          veiculos={veiculos}
          descricoesPorOs={descricoesPorOs}
          onAbrirDetalhe={setOsDetalhe}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <GradeCalendario
              dias={dias}
              visao={visao}
              mesReferencia={referencia}
              hoje={inicioDoDia(new Date())}
              diaSelecionado={diaSelecionado}
              ordensPorDia={ordensPorDia}
              carregando={carregando}
              clientes={clientes}
              descricoesPorOs={descricoesPorOs}
              onSelecionarDia={selecionarDiaEVerDetalhes}
              onAbrirDetalhe={setOsDetalhe}
            />
          </div>
          {visao === "mes" ? (
            <div className="flex flex-col gap-4 md:hidden">
              <GradeCalendarioCompacta
                dias={dias}
                mesReferencia={referencia}
                hoje={inicioDoDia(new Date())}
                diaSelecionado={diaSelecionado ?? inicioDoDia(new Date())}
                ordensPorDia={ordensPorDia}
                carregando={carregando}
                onSelecionarDia={setDiaSelecionado}
              />
              <PainelDiaSelecionado
                dia={diaSelecionado ?? inicioDoDia(new Date())}
                ordens={ordensPorDia.get(chaveDia(diaSelecionado ?? inicioDoDia(new Date()))) ?? []}
                clientes={clientes}
                veiculos={veiculos}
                descricoesPorOs={descricoesPorOs}
                carregando={carregando}
                onAbrirDetalhe={setOsDetalhe}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:hidden">
              <ListaMobile
                dias={dias}
                hoje={inicioDoDia(new Date())}
                ordensPorDia={ordensPorDia}
                carregando={carregando}
                clientes={clientes}
                veiculos={veiculos}
                descricoesPorOs={descricoesPorOs}
                onAbrirDetalhe={setOsDetalhe}
              />
            </div>
          )}
        </>
      )}

      <DetalheDialog
        os={osDetalhe}
        cliente={osDetalhe ? clientes.get(osDetalhe.cliente_id) : undefined}
        veiculo={osDetalhe?.veiculo_id ? veiculos.get(osDetalhe.veiculo_id) : undefined}
        descricoes={osDetalhe ? descricoesPorOs.get(osDetalhe.id) : undefined}
        onOpenChange={(open) => !open && setOsDetalhe(null)}
      />
    </div>
  );
}

function CartaoOs({
  os,
  cliente,
  descricoes,
  compacto,
  onClick,
}: {
  os: OrdemServico;
  cliente: Cliente | undefined;
  descricoes: string[] | undefined;
  compacto: boolean;
  onClick: () => void;
}) {
  const config = CORES[os.status];
  const Icon = config.icon;
  const servico = descricoes?.[0] ?? "Serviço";
  const extras = (descricoes?.length ?? 0) - 1;
  const nomeCliente = cliente?.nome ?? "Cliente";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`OS #${os.numero}, ${nomeCliente}, ${servico}, ${STATUS_OS_LABELS[os.status]}`}
      className="flex w-full items-start gap-1.5 rounded-[8px] border-l-[3px] px-1.5 py-1 text-left transition-opacity hover:opacity-80"
      style={{ backgroundColor: config.corSuave, borderLeftColor: config.cor }}
    >
      <Icon className="mt-0.5 size-3 shrink-0" style={{ color: config.corTexto }} />
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-[11px] font-medium" style={{ color: config.corTexto }}>
          {nomeCliente}
        </span>
        {!compacto && (
          <span className="block truncate text-[11px]" style={{ color: config.corTexto }}>
            {servico}
            {extras > 0 ? ` +${extras}` : ""}
          </span>
        )}
      </span>
    </button>
  );
}

function GradeCalendario({
  dias,
  visao,
  mesReferencia,
  hoje,
  diaSelecionado,
  ordensPorDia,
  carregando,
  clientes,
  descricoesPorOs,
  onSelecionarDia,
  onAbrirDetalhe,
}: {
  dias: Date[];
  visao: Visao;
  mesReferencia: Date;
  hoje: Date;
  diaSelecionado: Date | null;
  ordensPorDia: Map<string, OrdemServico[]>;
  carregando: boolean;
  clientes: Map<string, Cliente>;
  descricoesPorOs: Map<string, string[]>;
  onSelecionarDia: (d: Date) => void;
  onAbrirDetalhe: (os: OrdemServico) => void;
}) {
  const limiteVisivel = visao === "mes" ? 3 : 20;

  return (
    <div className="overflow-hidden rounded-[18px] border border-border shadow-[0_10px_30px_rgba(22,22,22,0.06)]">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const chave = chaveDia(dia);
          const ordensDoDia = ordensPorDia.get(chave) ?? [];
          const foraDoMes = visao === "mes" && dia.getMonth() !== mesReferencia.getMonth();
          const ehHoje = mesmoDia(dia, hoje);
          const ehSelecionado = diaSelecionado !== null && mesmoDia(dia, diaSelecionado);
          const fimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;

          return (
            <div
              key={chave}
              className={cn(
                "flex min-h-28 flex-col gap-1 border-r border-b border-border p-1.5 last:border-r-0",
                fimDeSemana && "bg-muted/20",
                foraDoMes && "opacity-40",
                visao === "semana" && "min-h-40"
              )}
            >
              <button
                type="button"
                onClick={() => onSelecionarDia(dia)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center self-start rounded-full text-xs font-medium transition-colors hover:bg-accent",
                  ehSelecionado && "ring-1 ring-primary",
                  ehHoje && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {dia.getDate()}
              </button>

              <div className="flex flex-col gap-1">
                {carregando ? (
                  <Skeleton className="h-4 w-full" />
                ) : (
                  <>
                    {ordensDoDia.slice(0, limiteVisivel).map((os) => (
                      <CartaoOs
                        key={os.id}
                        os={os}
                        cliente={clientes.get(os.cliente_id)}
                        descricoes={descricoesPorOs.get(os.id)}
                        compacto={visao === "mes"}
                        onClick={() => onAbrirDetalhe(os)}
                      />
                    ))}
                    {ordensDoDia.length > limiteVisivel && (
                      <button
                        type="button"
                        onClick={() => onSelecionarDia(dia)}
                        className="px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        +{ordensDoDia.length - limiteVisivel} serviços
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListaMobile({
  dias,
  hoje,
  ordensPorDia,
  carregando,
  clientes,
  veiculos,
  descricoesPorOs,
  onAbrirDetalhe,
}: {
  dias: Date[];
  hoje: Date;
  ordensPorDia: Map<string, OrdemServico[]>;
  carregando: boolean;
  clientes: Map<string, Cliente>;
  veiculos: Map<string, Veiculo>;
  descricoesPorOs: Map<string, string[]>;
  onAbrirDetalhe: (os: OrdemServico) => void;
}) {
  const diasComServico = dias.filter((d) => (ordensPorDia.get(chaveDia(d)) ?? []).length > 0);

  if (carregando) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (diasComServico.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Nenhum serviço neste período.
      </p>
    );
  }

  return (
    <>
      {diasComServico.map((dia) => (
        <div key={chaveDia(dia)} className="flex flex-col gap-2">
          <p className={cn("text-xs font-semibold uppercase", mesmoDia(dia, hoje) && "text-primary")}>
            {dia.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          <div className="flex flex-col gap-2">
            {(ordensPorDia.get(chaveDia(dia)) ?? []).map((os) => (
              <ItemListaOs
                key={os.id}
                os={os}
                cliente={clientes.get(os.cliente_id)}
                veiculo={os.veiculo_id ? veiculos.get(os.veiculo_id) : null}
                descricoes={descricoesPorOs.get(os.id)}
                onClick={() => onAbrirDetalhe(os)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Grade compacta do mês, só para celular — mostra o dia + até 3 marcadores de
 * status, sem os mini-cartões da grade do desktop. Ao tocar num dia, só troca
 * `diaSelecionado` (o painel abaixo atualiza); não troca de visão. */
function GradeCalendarioCompacta({
  dias,
  mesReferencia,
  hoje,
  diaSelecionado,
  ordensPorDia,
  carregando,
  onSelecionarDia,
}: {
  dias: Date[];
  mesReferencia: Date;
  hoje: Date;
  diaSelecionado: Date;
  ordensPorDia: Map<string, OrdemServico[]>;
  carregando: boolean;
  onSelecionarDia: (d: Date) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border shadow-[0_10px_30px_rgba(22,22,22,0.06)]">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 p-1.5">
        {dias.map((dia) => {
          const chave = chaveDia(dia);
          const ordensDoDia = ordensPorDia.get(chave) ?? [];
          const foraDoMes = dia.getMonth() !== mesReferencia.getMonth();
          const ehHoje = mesmoDia(dia, hoje);
          const ehSelecionado = mesmoDia(dia, diaSelecionado);
          const contagemPorStatus = new Map<StatusOs, number>();
          for (const os of ordensDoDia) {
            contagemPorStatus.set(os.status, (contagemPorStatus.get(os.status) ?? 0) + 1);
          }
          const statusComContagem: StatusOs[] = ["agendado", "em_execucao"];
          const outrosStatus = [...new Set(ordensDoDia.map((os) => os.status))].filter(
            (s) => !statusComContagem.includes(s)
          );

          return (
            <button
              key={chave}
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[10px] py-1.5 transition-colors",
                ehSelecionado && "ring-2 ring-[#F5B800]",
                foraDoMes && "opacity-30"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                  ehHoje && "bg-primary text-primary-foreground"
                )}
              >
                {dia.getDate()}
              </span>
              <span className="flex h-4 items-center gap-0.5">
                {!carregando && (
                  <>
                    {statusComContagem.map((status) => {
                      const qtd = contagemPorStatus.get(status) ?? 0;
                      if (qtd === 0) return null;
                      const config = CORES[status];
                      return (
                        <span
                          key={status}
                          className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-semibold"
                          style={{
                            borderColor: config.cor,
                            backgroundColor: `${config.cor}1f`,
                            color: config.corTexto,
                          }}
                        >
                          {qtd}
                        </span>
                      );
                    })}
                    {outrosStatus.slice(0, 1).map((status) =>
                      status === "cancelado" ? (
                        <XCircle key={status} className="size-2 shrink-0" style={{ color: CORES[status].cor }} />
                      ) : (
                        <span
                          key={status}
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CORES[status].cor }}
                        />
                      )
                    )}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Painel do dia selecionado, abaixo da grade compacta — lista os serviços
 * daquele dia com o cartão específico desta visão (ícone neutro, status como
 * linha com bolinha, seta indicando que abre o detalhe). */
function PainelDiaSelecionado({
  dia,
  ordens,
  clientes,
  veiculos,
  descricoesPorOs,
  carregando,
  onAbrirDetalhe,
}: {
  dia: Date;
  ordens: OrdemServico[];
  clientes: Map<string, Cliente>;
  veiculos: Map<string, Veiculo>;
  descricoesPorOs: Map<string, string[]>;
  carregando: boolean;
  onAbrirDetalhe: (os: OrdemServico) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <p className="text-sm font-semibold capitalize">
            {dia.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-xs text-muted-foreground">Serviços empilhados no dia</p>
        </div>
        {!carregando && ordens.length > 0 && (
          <span
            className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#101314]"
            style={{ backgroundColor: CORES.agendado.cor }}
          >
            {ordens.length}
          </span>
        )}
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : ordens.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum serviço neste dia.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordens.map((os) => (
            <CartaoDiaSelecionado
              key={os.id}
              os={os}
              cliente={clientes.get(os.cliente_id)}
              veiculo={os.veiculo_id ? veiculos.get(os.veiculo_id) : null}
              descricoes={descricoesPorOs.get(os.id)}
              onClick={() => onAbrirDetalhe(os)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoDiaSelecionado({
  os,
  cliente,
  veiculo,
  descricoes,
  onClick,
}: {
  os: OrdemServico;
  cliente: Cliente | undefined;
  veiculo: Veiculo | null | undefined;
  descricoes: string[] | undefined;
  onClick: () => void;
}) {
  const config = CORES[os.status];
  const nomeVeiculo = veiculo ? veiculo.modelo || veiculo.placa || "Veículo" : null;
  const servico = descricoes?.[0] ?? "Serviço";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`OS #${os.numero}, ${cliente?.nome ?? "Cliente"}, ${STATUS_OS_LABELS[os.status]}`}
      className="flex items-center gap-3 rounded-[14px] border-2 bg-card p-3 text-left transition-opacity hover:opacity-90"
      style={{ borderColor: `${config.cor}55` }}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted">
        <Car className="size-4 text-muted-foreground" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{cliente?.nome ?? "Cliente"}</span>
        <span className="truncate text-xs text-muted-foreground">
          {nomeVeiculo ? `${nomeVeiculo} · ${servico}` : servico}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: config.corTexto }}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: config.cor }} />
          {STATUS_OS_LABELS[os.status]}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ItemListaOs({
  os,
  cliente,
  veiculo,
  descricoes,
  onClick,
}: {
  os: OrdemServico;
  cliente: Cliente | undefined;
  veiculo: Veiculo | null | undefined;
  descricoes: string[] | undefined;
  onClick: () => void;
}) {
  const config = CORES[os.status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`OS #${os.numero}, ${cliente?.nome ?? "Cliente"}, ${STATUS_OS_LABELS[os.status]}`}
      className="flex items-start gap-3 rounded-[12px] border-l-4 bg-card p-3 text-left shadow-[0_8px_26px_rgba(25,26,24,0.05)]"
      style={{ borderLeftColor: config.cor }}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: config.corSuave, color: config.corTexto }}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{cliente?.nome ?? "Cliente"}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Car className="size-3 shrink-0" />
          {veiculo ? veiculo.placa || veiculo.modelo || "Veículo" : "Sem veículo"}
        </span>
        <span className="truncate text-xs text-muted-foreground">{descricoes?.join(", ") ?? "Serviço"}</span>
      </span>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: config.corSuave, color: config.corTexto }}
      >
        {STATUS_OS_LABELS[os.status]}
      </span>
    </button>
  );
}

function VisaoDia({
  dia,
  ordens,
  carregando,
  clientes,
  veiculos,
  descricoesPorOs,
  onAbrirDetalhe,
}: {
  dia: Date;
  ordens: OrdemServico[];
  carregando: boolean;
  clientes: Map<string, Cliente>;
  veiculos: Map<string, Veiculo>;
  descricoesPorOs: Map<string, string[]>;
  onAbrirDetalhe: (os: OrdemServico) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4 shadow-[0_10px_30px_rgba(22,22,22,0.06)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize">
          {dia.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </h2>
        <span className="text-sm text-muted-foreground">
          {ordens.length} serviço{ordens.length === 1 ? "" : "s"}
        </span>
      </div>

      {carregando ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : ordens.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum serviço neste período.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ordens.map((os) => (
            <ItemListaOs
              key={os.id}
              os={os}
              cliente={clientes.get(os.cliente_id)}
              veiculo={os.veiculo_id ? veiculos.get(os.veiculo_id) : null}
              descricoes={descricoesPorOs.get(os.id)}
              onClick={() => onAbrirDetalhe(os)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DetalheDialog({
  os,
  cliente,
  veiculo,
  descricoes,
  onOpenChange,
}: {
  os: OrdemServico | null;
  cliente: Cliente | undefined;
  veiculo: Veiculo | undefined;
  descricoes: string[] | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={os !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {os && (
          <>
            <DialogHeader>
              <DialogTitle>OS #{os.numero}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{cliente?.nome ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Veículo</span>
                <span className="font-medium">
                  {veiculo ? `${veiculo.marca ?? ""} ${veiculo.modelo ?? ""}`.trim() || veiculo.placa : "Sem veículo"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Serviço</span>
                <span className="text-right font-medium">{descricoes?.join(", ") ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="num font-medium capitalize">
                  {new Date(os.entrada_em).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: CORES[os.status].corSuave,
                    color: CORES[os.status].corTexto,
                  }}
                >
                  {STATUS_OS_LABELS[os.status]}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button variant="gradient" render={<Link href={`/ordens/${os.id}`} />} nativeButton={false}>
                Abrir OS
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
