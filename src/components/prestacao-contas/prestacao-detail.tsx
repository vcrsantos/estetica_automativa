"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { Ban, CheckCircle2, Download, Loader2, MessageCircle, Receipt } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import { PrestacaoPdf } from "@/components/prestacao-contas/prestacao-pdf";
import { ConfirmarPagamentoDialog } from "@/components/prestacao-contas/confirmar-pagamento-dialog";
import { CancelarPrestacaoDialog } from "@/components/prestacao-contas/cancelar-prestacao-dialog";
import type { ConfiguracaoEmitente, PrestacaoConta, PrestacaoContaItem, PrestacaoStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function veiculoLinha(item: PrestacaoContaItem) {
  const partes = [item.veiculo_placa || "Sem placa", item.veiculo_porte ? PORTE_LABELS[item.veiculo_porte] : null];
  return partes.filter(Boolean).join(" · ");
}

const STATUS_LABELS: Record<PrestacaoStatus, string> = {
  aberto: "Em aberto",
  pago: "Pago",
  cancelado: "Cancelado",
};

const STATUS_PILL_CLASS: Record<PrestacaoStatus, string> = {
  aberto: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  pago: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

function StatusPill({ status }: { status: PrestacaoStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        STATUS_PILL_CLASS[status]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatBox({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("text-lg font-bold", destaque && "text-primary")}>{value}</p>
    </div>
  );
}

export function PrestacaoDetail({
  prestacao,
  itens,
  isAdmin,
}: {
  prestacao: PrestacaoConta;
  itens: PrestacaoContaItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [gerandoPdf, setGerandoPdf] = React.useState(false);
  const [dialogConfirmarAberto, setDialogConfirmarAberto] = React.useState(false);
  const [dialogCancelarAberto, setDialogCancelarAberto] = React.useState(false);

  const vencida =
    prestacao.status === "aberto" && !!prestacao.data_vencimento && prestacao.data_vencimento < hojeIso();

  async function buscarEmitente(): Promise<ConfiguracaoEmitente | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("configuracao_emitente")
      .select("*")
      .eq("unidade_id", prestacao.unidade_id)
      .maybeSingle();
    return data;
  }

  async function baixarPdf() {
    setGerandoPdf(true);
    try {
      const emitente = await buscarEmitente();
      const blob = await pdf(
        <PrestacaoPdf prestacao={prestacao} itens={itens} emitente={emitente} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prestacao-${prestacao.numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  }

  function enviarPorWhatsApp() {
    if (!prestacao.telefone) {
      toast.error("Esta prestação não tem telefone de contato.");
      return;
    }
    const linhas = itens.map(
      (item, i) =>
        `${i + 1}. ${formatarData(item.data)} · ${item.veiculo_nome || "Sem veículo"} — ${item.descricao} — ${formatarMoeda(item.valor)}`
    );
    const mensagem = [
      `*PRESTAÇÃO DE CONTAS — POLIBRILHO*`,
      `${prestacao.numero} · ${prestacao.cliente_nome}`,
      `Período: ${formatarData(prestacao.data_inicio)} a ${formatarData(prestacao.data_fim)}`,
      "",
      ...linhas,
      "",
      `*Total: ${formatarMoeda(prestacao.valor_total)}*`,
      prestacao.data_vencimento ? `Vencimento: ${formatarData(prestacao.data_vencimento)}` : "",
      prestacao.observacoes ? `Obs.: ${prestacao.observacoes}` : "",
      "",
      "Documento de controle dos serviços realizados. Não substitui nota fiscal.",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(linkWhatsApp(prestacao.telefone, mensagem), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">{prestacao.numero}</p>
          <h1 className="text-2xl font-bold tracking-tight">{prestacao.cliente_nome}</h1>
          <p className="text-muted-foreground">{prestacao.documento || "Documento não informado"}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <StatusPill status={prestacao.status} />
            {vencida && <Badge variant="destructive">Vencida</Badge>}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={gerandoPdf} onClick={baixarPdf}>
              {gerandoPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar PDF
            </Button>
            {prestacao.status === "aberto" && (
              <>
                <Button variant="outline" onClick={enviarPorWhatsApp}>
                  <MessageCircle className="size-4" />
                  Enviar por WhatsApp
                </Button>
                <Button onClick={() => setDialogConfirmarAberto(true)}>
                  <CheckCircle2 className="size-4" />
                  Confirmar pagamento
                </Button>
                {isAdmin && (
                  <Button variant="destructive" onClick={() => setDialogCancelarAberto(true)}>
                    <Ban className="size-4" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {prestacao.status === "pago" && prestacao.recibo_id && (
        <Card className="max-w-lg border-green-500/40">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Pagamento confirmado</p>
              <p className="text-sm text-muted-foreground">
                {prestacao.pago_em && `Recebido em ${new Date(prestacao.pago_em).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <Button variant="outline" render={<Link href={`/recibos/${prestacao.recibo_id}`} />} nativeButton={false}>
              <Receipt className="size-4" />
              Ver recibo
            </Button>
          </CardContent>
        </Card>
      )}

      {prestacao.status === "cancelado" && (
        <Card className="max-w-lg border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Cancelada em {prestacao.cancelado_em && new Date(prestacao.cancelado_em).toLocaleDateString("pt-BR")}
            . Motivo: {prestacao.motivo_cancelamento}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Período" value={`${formatarData(prestacao.data_inicio)} a ${formatarData(prestacao.data_fim)}`} />
        <StatBox label="Serviços" value={String(itens.length)} />
        <StatBox
          label="Vencimento"
          value={prestacao.data_vencimento ? formatarData(prestacao.data_vencimento) : "—"}
        />
        <StatBox label="Total" value={formatarMoeda(prestacao.valor_total)} destaque />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left">Data</th>
              <th className="px-4 py-2.5 text-left">Veículo</th>
              <th className="px-4 py-2.5 text-left">Serviço</th>
              <th className="px-4 py-2.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3 align-top whitespace-nowrap">{formatarData(item.data)}</td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium">{item.veiculo_nome || "Sem veículo"}</p>
                  <p className="text-xs text-muted-foreground">{veiculoLinha(item)}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">{item.os_observacoes || "Sem observações"}</p>
                </td>
                <td className="px-4 py-3 text-right align-top font-semibold whitespace-nowrap">
                  {formatarMoeda(item.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prestacao.observacoes && (
        <p className="text-sm text-muted-foreground">Observações: {prestacao.observacoes}</p>
      )}

      <ConfirmarPagamentoDialog
        prestacaoId={prestacao.id}
        valorTotal={prestacao.valor_total}
        open={dialogConfirmarAberto}
        onOpenChange={setDialogConfirmarAberto}
        onConfirmado={() => router.refresh()}
      />
      <CancelarPrestacaoDialog
        prestacaoId={prestacao.id}
        open={dialogCancelarAberto}
        onOpenChange={setDialogCancelarAberto}
        onCancelada={() => router.refresh()}
      />
    </div>
  );
}
