"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageCircle, Pencil, PlayCircle, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const STATUS_BADGE_VARIANT: Record<StatusOs, "info" | "outline" | "destructive" | "success"> = {
  agendado: "outline",
  em_execucao: "info",
  finalizado: "success",
  entregue: "success",
  cancelado: "destructive",
};

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
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    setOs(data);
    toast.success(`Status atualizado para "${STATUS_OS_LABELS[novoStatus]}".`);
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
      toast.error("Não foi possível salvar o pagamento.");
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">OS #{os.numero}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[os.status]}>{STATUS_OS_LABELS[os.status]}</Badge>
            {os.status !== "cancelado" && <StatusPagamentoBadge status={os.status_pagamento} />}
          </div>
          <p className="text-muted-foreground">
            {unidade.nome} · aberta em{" "}
            {new Date(os.entrada_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {os.status === "agendado" && (
            <Button disabled={salvandoStatus} onClick={() => mudarStatus("em_execucao")}>
              {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              Iniciar execução
            </Button>
          )}
          {os.status === "em_execucao" && (
            <Button disabled={salvandoStatus} onClick={() => mudarStatus("finalizado")}>
              {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Finalizar
            </Button>
          )}
          {os.status === "finalizado" && (
            <Button disabled={salvandoStatus} onClick={() => mudarStatus("entregue")}>
              {salvandoStatus ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Marcar como entregue
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
          {os.status !== "cancelado" && os.status !== "entregue" && (
            <Button variant="ghost" className="text-destructive" onClick={() => setDialogCancelarAberto(true)}>
              <XCircle className="size-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {os.status === "cancelado" && os.motivo_cancelamento && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm">
            <span className="font-medium">Motivo do cancelamento: </span>
            {os.motivo_cancelamento}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e veículo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
              {cliente.nome}
            </Link>
            <p className="text-muted-foreground">{cliente.telefone || "Sem telefone"}</p>
            {veiculo ? (
              <p>
                {veiculo.placa || "Sem placa"} — {veiculo.marca} {veiculo.modelo} ·{" "}
                {PORTE_LABELS[veiculo.porte]}
              </p>
            ) : (
              <p className="text-muted-foreground">Sem veículo (atendimento externo)</p>
            )}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Serviços</CardTitle>
            {!editandoServicos && os.status !== "cancelado" && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Editar serviços"
                disabled={edicaoBloqueada}
                onClick={iniciarEdicaoServicos}
              >
                <Pencil className="size-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
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
                  <div key={item.id} className="flex items-center justify-between">
                    <span>{item.descricao}</span>
                    <span className="flex items-center gap-1">
                      {item.valor_praticado !== item.valor_tabela && (
                        <span className="text-xs text-muted-foreground line-through">
                          {item.valor_tabela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                      <span className="font-medium">
                        {item.valor_praticado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </span>
                  </div>
                ))}
                {os.desconto > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Desconto</span>
                    <span>- {os.desconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{os.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
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

                <div className="flex items-end gap-2 border-t pt-2">
                  <div className="flex w-28 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Desconto</span>
                    <Input value={descontoEdicao} onChange={(e) => setDescontoEdicao(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="flex flex-1 items-center justify-end font-semibold">
                    Total: {totalEdicao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    items={{ nenhuma: "A definir", ...FORMA_PAGAMENTO_LABELS }}
                    value={formaPagamento}
                    onValueChange={(v) => setFormaPagamento(v as FormaPagamento | "nenhuma")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Forma de pagamento" />
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

                  <Select
                    items={STATUS_PAGAMENTO_LABELS}
                    value={statusPagamento}
                    onValueChange={(v) => setStatusPagamento(v as StatusPagamento)}
                  >
                    <SelectTrigger>
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
                <Button
                  size="sm"
                  className="w-fit"
                  disabled={salvandoPagamento}
                  onClick={salvarPagamento}
                >
                  {salvandoPagamento && <Loader2 className="size-4 animate-spin" />}
                  Salvar pagamento
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogCancelarAberto} onOpenChange={setDialogCancelarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar OS #{os.numero}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              O motivo é obrigatório e a OS é preservada no histórico (não é apagada).
            </p>
            <Textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              rows={3}
              placeholder="Motivo do cancelamento"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogCancelarAberto(false)}>
              Voltar
            </Button>
            <Button variant="destructive" disabled={salvandoStatus} onClick={cancelar}>
              {salvandoStatus && <Loader2 className="size-4 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
