"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { linkWhatsApp } from "@/lib/whatsapp";
import {
  FORMA_PAGAMENTO_LABELS,
  STATUS_OS_LABELS,
  STATUS_PAGAMENTO_LABELS,
} from "@/lib/validations/ordem-servico";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";
import type {
  Cliente,
  FormaPagamento,
  OrdemServico,
  OsItem,
  PrestacaoConta,
  StatusOs,
  StatusPagamento,
  Unidade,
  Veiculo,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CorEtapa = { cor: string; corSuave: string; corTexto: string; icon: typeof Calendar };

/** Mesma paleta semântica da Fila do dia — mantém as duas telas consistentes. */
const CORES_ETAPA: Record<"agendado" | "em_execucao" | "finalizado", CorEtapa> = {
  agendado: { cor: "#F5B800", corSuave: "#FFF8DC", corTexto: "#835F00", icon: Calendar },
  em_execucao: { cor: "#2D72E8", corSuave: "#EDF4FF", corTexto: "#1D56AD", icon: PlayCircle },
  finalizado: { cor: "#20A36A", corSuave: "#EAF8F1", corTexto: "#16764C", icon: CheckCircle2 },
};
const DANGER = { cor: "#D73C3C", corSuave: "#FFF0F0", corTexto: "#AD2929" };

/** "Entregue" já saiu da fila ativa — visualmente é a mesma etapa final "Finalizado". */
function etapaEfetiva(status: StatusOs): "agendado" | "em_execucao" | "finalizado" {
  if (status === "entregue") return "finalizado";
  if (status === "agendado" || status === "em_execucao" || status === "finalizado") return status;
  return "finalizado";
}

const ORDEM_ETAPAS: ("agendado" | "em_execucao" | "finalizado")[] = [
  "agendado",
  "em_execucao",
  "finalizado",
];

function situacaoEtapa(etapa: StatusOs, statusAtual: StatusOs) {
  const idxAtual = ORDEM_ETAPAS.indexOf(etapaEfetiva(statusAtual));
  const idxEtapa = ORDEM_ETAPAS.indexOf(etapa as (typeof ORDEM_ETAPAS)[number]);
  if (idxEtapa < idxAtual) return "concluido" as const;
  if (idxEtapa === idxAtual) return "atual" as const;
  if (idxEtapa === idxAtual + 1) return "proxima" as const;
  return "depois" as const;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function IndicadorAndamento({ status }: { status: StatusOs }) {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-3 md:flex-row md:items-center md:gap-0 md:p-4">
      {ORDEM_ETAPAS.map((etapa, index) => {
        const config = CORES_ETAPA[etapa];
        const Icon = config.icon;
        const situacao = situacaoEtapa(etapa, status);
        const destaque = situacao === "concluido" || situacao === "atual";
        const textoSituacao =
          situacao === "concluido"
            ? "Concluído"
            : situacao === "atual"
              ? "Atual"
              : situacao === "proxima"
                ? "Próxima"
                : "Depois";

        return (
          <React.Fragment key={etapa}>
            <div
              aria-current={situacao === "atual" ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 md:flex-1 md:justify-center",
                situacao === "atual" && "border-l-4 md:border-l-0 md:border-t-4"
              )}
              style={
                situacao === "atual"
                  ? { backgroundColor: config.corSuave, borderColor: config.cor }
                  : undefined
              }
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: destaque ? config.corSuave : "var(--muted)",
                  color: destaque ? config.corTexto : "var(--muted-foreground)",
                }}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col leading-tight">
                <span
                  className="text-sm font-medium"
                  style={{ color: destaque ? config.corTexto : undefined }}
                >
                  {STATUS_OS_LABELS[etapa]}
                </span>
                <span className="text-xs text-muted-foreground">{textoSituacao}</span>
              </div>
            </div>
            {index < ORDEM_ETAPAS.length - 1 && (
              <div className="mx-1 hidden h-px flex-1 bg-border md:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function OrdemDetail({
  os: osInicial,
  cliente,
  veiculo,
  unidade,
  itens,
  executoresNomes,
}: {
  os: OrdemServico;
  cliente: Cliente;
  veiculo: Veiculo | null;
  unidade: Unidade;
  itens: OsItem[];
  executoresNomes: string[];
}) {
  const router = useRouter();
  const [os, setOs] = React.useState(osInicial);
  const [salvandoStatus, setSalvandoStatus] = React.useState(false);
  const [dialogCancelarAberto, setDialogCancelarAberto] = React.useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<FormaPagamento | "nenhuma">(
    os.forma_pagamento ?? "nenhuma"
  );
  const [statusPagamento, setStatusPagamento] = React.useState<StatusPagamento>(os.status_pagamento);
  const [salvandoPagamento, setSalvandoPagamento] = React.useState(false);
  const [prestacaoVinculada, setPrestacaoVinculada] = React.useState<Pick<
    PrestacaoConta,
    "id" | "numero" | "status"
  > | null>(null);
  const [reciboVinculado, setReciboVinculado] = React.useState<{ id: string; numero: number } | null>(null);
  const [editandoServicos, setEditandoServicos] = React.useState(false);
  const [itensEdicao, setItensEdicao] = React.useState<{ id: string | null; descricao: string; valor: string }[]>(
    []
  );
  const [descontoEdicao, setDescontoEdicao] = React.useState(String(os.desconto));
  const [salvandoServicos, setSalvandoServicos] = React.useState(false);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const supabase = createClient();
      const { data: item } = await supabase
        .from("prestacao_conta_item")
        .select("prestacao_id")
        .eq("os_id", os.id)
        .eq("ativo", true)
        .maybeSingle();

      if (!item) {
        if (!cancelado) setPrestacaoVinculada(null);
        return;
      }

      const { data: prestacao } = await supabase
        .from("prestacao_conta")
        .select("id, numero, status")
        .eq("id", item.prestacao_id)
        .single();

      if (!cancelado) setPrestacaoVinculada(prestacao);
    }

    async function carregarRecibo() {
      const supabase = createClient();
      const { data: vinculo } = await supabase
        .from("recibo_os")
        .select("recibo_id")
        .eq("os_id", os.id)
        .eq("ativo", true)
        .maybeSingle();

      if (!vinculo) {
        if (!cancelado) setReciboVinculado(null);
        return;
      }

      const { data: recibo } = await supabase
        .from("recibo")
        .select("id, numero")
        .eq("id", vinculo.recibo_id)
        .single();

      if (!cancelado) setReciboVinculado(recibo);
    }

    carregar();
    carregarRecibo();
    return () => {
      cancelado = true;
    };
  }, [os.id]);

  async function mudarStatus(novoStatus: StatusOs) {
    setSalvandoStatus(true);
    const supabase = createClient();
    const camposExtras = novoStatus === "entregue" ? { saida_em: new Date().toISOString() } : {};
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({ status: novoStatus, ...camposExtras })
      .eq("id", os.id)
      .select("*")
      .single();

    setSalvandoStatus(false);
    if (error || !data) {
      toast.error(`Não foi possível atualizar a OS #${os.numero}. A alteração não foi concluída.`);
      return;
    }
    setOs(data);
    toast.success(`OS #${os.numero} atualizada para ${STATUS_OS_LABELS[novoStatus]}.`);
  }

  async function cancelar() {
    if (!motivoCancelamento.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    setSalvandoStatus(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({ status: "cancelado", motivo_cancelamento: motivoCancelamento.trim() })
      .eq("id", os.id)
      .select("*")
      .single();

    setSalvandoStatus(false);
    if (error || !data) {
      toast.error("Não foi possível cancelar a OS.");
      return;
    }
    setOs(data);
    setDialogCancelarAberto(false);
    toast.success("OS cancelada.");
  }

  const pagamentoAlterado =
    formaPagamento !== (os.forma_pagamento ?? "nenhuma") || statusPagamento !== os.status_pagamento;

  async function salvarPagamento() {
    setSalvandoPagamento(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({
        forma_pagamento: formaPagamento === "nenhuma" ? null : formaPagamento,
        status_pagamento: statusPagamento,
      })
      .eq("id", os.id)
      .select("*")
      .single();

    setSalvandoPagamento(false);
    if (error || !data) {
      toast.error("Não foi possível salvar o pagamento. Tente novamente.");
      return;
    }
    setOs(data);
    toast.success("Pagamento atualizado.");
  }

  const edicaoBloqueada = reciboVinculado !== null || (prestacaoVinculada?.status === "aberto");

  function iniciarEdicaoServicos() {
    setItensEdicao(itens.map((i) => ({ id: i.id, descricao: i.descricao, valor: String(i.valor_praticado) })));
    setDescontoEdicao(String(os.desconto));
    setEditandoServicos(true);
  }

  function atualizarItemEdicao(index: number, campo: "descricao" | "valor", valor: string) {
    setItensEdicao((atual) => atual.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function adicionarItemEdicao() {
    setItensEdicao((atual) => [...atual, { id: null, descricao: "", valor: "" }]);
  }

  function removerItemEdicao(index: number) {
    setItensEdicao((atual) => atual.filter((_, i) => i !== index));
  }

  const totalEdicao =
    itensEdicao.reduce((acc, i) => acc + (Number(i.valor.replace(",", ".")) || 0), 0) -
    (Number(descontoEdicao.replace(",", ".")) || 0);

  async function salvarServicos() {
    if (itensEdicao.some((i) => !i.descricao.trim())) {
      toast.error("Preencha a descrição de todos os itens.");
      return;
    }
    if (itensEdicao.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }
    const desconto = Number(descontoEdicao.replace(",", ".")) || 0;
    if (totalEdicao < 0) {
      toast.error("O desconto não pode ser maior que o total dos itens.");
      return;
    }

    setSalvandoServicos(true);
    const supabase = createClient();

    const idsMantidos = new Set(itensEdicao.filter((i) => i.id).map((i) => i.id as string));
    const idsRemovidos = itens.map((i) => i.id).filter((id) => !idsMantidos.has(id));

    if (idsRemovidos.length > 0) {
      const { error } = await supabase.from("os_itens").delete().in("id", idsRemovidos);
      if (error) {
        toast.error("Não foi possível remover um dos itens.");
        setSalvandoServicos(false);
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const item of itensEdicao) {
      const valor = Number(item.valor.replace(",", ".")) || 0;
      if (item.id) {
        const { error } = await supabase
          .from("os_itens")
          .update({ descricao: item.descricao.trim(), valor_praticado: valor, alterado_por: user?.id ?? null })
          .eq("id", item.id);
        if (error) {
          toast.error("Não foi possível salvar um dos itens.");
          setSalvandoServicos(false);
          return;
        }
      } else {
        const { error } = await supabase.from("os_itens").insert({
          os_id: os.id,
          servico_id: null,
          descricao: item.descricao.trim(),
          valor_tabela: valor,
          valor_praticado: valor,
          alterado_por: user?.id ?? null,
        });
        if (error) {
          toast.error("Não foi possível adicionar um dos itens.");
          setSalvandoServicos(false);
          return;
        }
      }
    }

    const { data, error: erroOs } = await supabase
      .from("ordens_servico")
      .update({ desconto, valor_total: totalEdicao })
      .eq("id", os.id)
      .select("*")
      .single();

    setSalvandoServicos(false);
    if (erroOs || !data) {
      toast.error("Não foi possível salvar o total da OS.");
      return;
    }
    setOs(data);
    setEditandoServicos(false);
    toast.success("Serviços atualizados.");
    router.refresh();
  }

  const mensagemPronto = `Oi, ${cliente.nome.split(" ")[0]}! Seu ${veiculo?.modelo || veiculo?.placa || "veículo"} está pronto na POLIBRILHO ${unidade.nome}. Pode vir buscar quando quiser!`;

  const etapaAtual = CORES_ETAPA[etapaEfetiva(os.status)];
  const podeVoltarFila = os.status === "agendado" || os.status === "em_execucao" || os.status === "finalizado";

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/fila-do-dia"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para a fila do dia
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">OS #{os.numero}</h1>
            {os.status === "cancelado" ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: DANGER.corSuave, color: DANGER.corTexto }}
              >
                <XCircle className="size-3.5" />
                Cancelada
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: etapaAtual.corSuave, color: etapaAtual.corTexto }}
              >
                <etapaAtual.icon className="size-3.5" />
                {STATUS_OS_LABELS[os.status]}
              </span>
            )}
            {os.status !== "cancelado" && <StatusPagamentoBadge status={os.status_pagamento} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {unidade.nome} · aberta em{" "}
            {new Date(os.entrada_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {os.status === "agendado" && (
              <Button disabled={salvandoStatus} onClick={() => mudarStatus("em_execucao")}>
                {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
                {salvandoStatus ? "Iniciando..." : "Iniciar execução"}
              </Button>
            )}
            {os.status === "em_execucao" && (
              <Button disabled={salvandoStatus} onClick={() => mudarStatus("finalizado")}>
                {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {salvandoStatus ? "Finalizando..." : "Finalizar serviço"}
              </Button>
            )}
            {os.status === "finalizado" && (
              <Button disabled={salvandoStatus} onClick={() => mudarStatus("entregue")}>
                {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Marcar como entregue
              </Button>
            )}
            {os.status === "entregue" && (
              <Button disabled variant="outline">
                <CheckCircle2 className="size-4" />
                Serviço finalizado
              </Button>
            )}
            {(os.status === "finalizado" || os.status === "entregue") && cliente.telefone && (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={linkWhatsApp(cliente.telefone, mensagemPronto)} target="_blank" rel="noopener noreferrer" />
                }
              >
                <MessageCircle className="size-4" />
                Avisar cliente
              </Button>
            )}
          </div>

          {os.status !== "cancelado" && os.status !== "entregue" && (
            <>
              <div className="hidden h-6 w-px bg-border sm:block" />
              <Button variant="ghost" className="text-destructive" onClick={() => setDialogCancelarAberto(true)}>
                <XCircle className="size-4" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {os.status === "cancelado" && os.motivo_cancelamento && (
        <div
          className="rounded-[14px] p-3 text-sm"
          style={{ backgroundColor: DANGER.corSuave, color: DANGER.corTexto }}
        >
          <span className="font-medium">Motivo do cancelamento: </span>
          {os.motivo_cancelamento}
        </div>
      )}

      {podeVoltarFila && <IndicadorAndamento status={os.status} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 rounded-[14px] p-[18px] shadow-[0_10px_30px_rgba(25,26,24,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <CardTitle>Cliente e veículo</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/clientes/${cliente.id}`} />}
              nativeButton={false}
            >
              <Pencil className="size-3.5" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-0 text-sm">
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                  {cliente.nome}
                </Link>
                <p className="text-muted-foreground">{cliente.telefone || "Telefone não informado"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Car className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Veículo</p>
                {veiculo ? (
                  <>
                    <p className="font-medium">
                      {veiculo.marca} {veiculo.modelo}
                    </p>
                    <p className="text-muted-foreground">
                      {veiculo.placa || "Sem placa"} · Porte {PORTE_LABELS[veiculo.porte].toLowerCase()}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sem veículo (atendimento externo)</p>
                )}
              </div>
            </div>

            {executoresNomes.length > 0 && (
              <p>
                <span className="text-muted-foreground">Executor(es): </span>
                {executoresNomes.join(", ")}
              </p>
            )}
            {os.observacoes && (
              <p>
                <span className="text-muted-foreground">Observações: </span>
                {os.observacoes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 rounded-[14px] p-[18px] shadow-[0_10px_30px_rgba(25,26,24,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <CardTitle>Serviços</CardTitle>
            </div>
            {!editandoServicos && os.status !== "cancelado" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={edicaoBloqueada}
                onClick={iniciarEdicaoServicos}
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 p-0 text-sm">
            {edicaoBloqueada && (
              <p className="text-xs text-muted-foreground">
                {reciboVinculado
                  ? "Já existe um recibo emitido pra esta OS — cancele o recibo para poder editar os serviços."
                  : "Pagamento controlado por uma prestação de contas em aberto — não dá pra editar aqui."}
              </p>
            )}

            {!editandoServicos ? (
              <>
                {itens.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="truncate">{item.descricao}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.valor_tabela > 0 && item.valor_praticado !== item.valor_tabela && (
                        <span className="num text-xs text-muted-foreground line-through">
                          {formatarMoeda(item.valor_tabela)}
                        </span>
                      )}
                      <span className="num font-medium">{formatarMoeda(item.valor_praticado)}</span>
                    </span>
                  </div>
                ))}
                {os.desconto > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Desconto</span>
                    <span className="num">- {formatarMoeda(os.desconto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <span className="font-medium">Total da OS</span>
                  <span className="num text-base font-semibold">{formatarMoeda(os.valor_total)}</span>
                </div>
              </>
            ) : (
              <>
                {itensEdicao.map((item, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {index === 0 && <span className="text-xs text-muted-foreground">Descrição</span>}
                      <Input
                        value={item.descricao}
                        onChange={(e) => atualizarItemEdicao(index, "descricao", e.target.value)}
                      />
                    </div>
                    <div className="flex w-28 flex-col gap-1">
                      {index === 0 && <span className="text-xs text-muted-foreground">Valor</span>}
                      <Input
                        value={item.valor}
                        onChange={(e) => atualizarItemEdicao(index, "valor", e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover item"
                      disabled={itensEdicao.length === 1}
                      onClick={() => removerItemEdicao(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-fit" onClick={adicionarItemEdicao}>
                  <Plus className="size-4" />
                  Adicionar item
                </Button>

                <div className="flex items-end gap-2 border-t border-border pt-2">
                  <div className="flex w-28 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Desconto</span>
                    <Input value={descontoEdicao} onChange={(e) => setDescontoEdicao(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="num flex flex-1 items-center justify-end font-semibold">
                    Total: {formatarMoeda(totalEdicao)}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" disabled={salvandoServicos} onClick={salvarServicos}>
                    {salvandoServicos && <Loader2 className="size-4 animate-spin" />}
                    Salvar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={salvandoServicos}
                    onClick={() => setEditandoServicos(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {os.status !== "cancelado" && (
        <Card className="gap-4 rounded-[14px] p-[18px] shadow-[0_10px_30px_rgba(25,26,24,0.06)]">
          <CardHeader className="p-0">
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-0">
            {prestacaoVinculada && prestacaoVinculada.status === "aberto" ? (
              <p className="text-sm text-muted-foreground">
                Pagamento controlado pela prestação{" "}
                <Link href={`/prestacao-contas/${prestacaoVinculada.id}`} className="font-medium text-primary hover:underline">
                  {prestacaoVinculada.numero}
                </Link>
                .
              </p>
            ) : (
              <>
                {prestacaoVinculada && prestacaoVinculada.status === "pago" && (
                  <p className="text-xs text-muted-foreground">
                    Pago pela prestação{" "}
                    <Link href={`/prestacao-contas/${prestacaoVinculada.id}`} className="text-primary hover:underline">
                      {prestacaoVinculada.numero}
                    </Link>
                    .
                  </p>
                )}

                <div
                  className="flex items-center gap-3 rounded-[12px] p-3"
                  style={{
                    backgroundColor:
                      os.status_pagamento === "pago" ? CORES_ETAPA.finalizado.corSuave : CORES_ETAPA.agendado.corSuave,
                  }}
                >
                  <Wallet
                    className="size-5 shrink-0"
                    style={{
                      color:
                        os.status_pagamento === "pago"
                          ? CORES_ETAPA.finalizado.corTexto
                          : CORES_ETAPA.agendado.corTexto,
                    }}
                  />
                  <div>
                    <p
                      className="text-xs"
                      style={{
                        color:
                          os.status_pagamento === "pago"
                            ? CORES_ETAPA.finalizado.corTexto
                            : CORES_ETAPA.agendado.corTexto,
                      }}
                    >
                      {os.status_pagamento === "pago" ? "Pagamento recebido" : "Valor a receber"}
                    </p>
                    <p
                      className="num text-lg font-semibold"
                      style={{
                        color:
                          os.status_pagamento === "pago"
                            ? CORES_ETAPA.finalizado.corTexto
                            : CORES_ETAPA.agendado.corTexto,
                      }}
                    >
                      {formatarMoeda(os.valor_total)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="forma-pagamento">Forma de pagamento</Label>
                    <Select
                      items={{ nenhuma: "A definir", ...FORMA_PAGAMENTO_LABELS }}
                      value={formaPagamento}
                      onValueChange={(v) => setFormaPagamento(v as FormaPagamento | "nenhuma")}
                    >
                      <SelectTrigger id="forma-pagamento" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">A definir</SelectItem>
                        {Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="situacao-pagamento">Situação</Label>
                    <Select
                      items={STATUS_PAGAMENTO_LABELS}
                      value={statusPagamento}
                      onValueChange={(v) => setStatusPagamento(v as StatusPagamento)}
                    >
                      <SelectTrigger id="situacao-pagamento" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_PAGAMENTO_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="gradient"
                  size="sm"
                  className="w-fit"
                  disabled={salvandoPagamento || !pagamentoAlterado}
                  onClick={salvarPagamento}
                >
                  {salvandoPagamento ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {salvandoPagamento ? "Salvando..." : "Salvar pagamento"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogCancelarAberto} onOpenChange={setDialogCancelarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar a OS #{os.numero}?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Esta ordem será removida da fila ativa. O histórico continuará disponível. O motivo é
              obrigatório.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivo-cancelamento-os">Motivo do cancelamento</Label>
              <Textarea
                id="motivo-cancelamento-os"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" autoFocus onClick={() => setDialogCancelarAberto(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={salvandoStatus} onClick={cancelar}>
              {salvandoStatus && <Loader2 className="size-4 animate-spin" />}
              Cancelar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
