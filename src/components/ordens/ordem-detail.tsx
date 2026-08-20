"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MessageCircle, PlayCircle, XCircle } from "lucide-react";
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

    carregar();
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
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
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
