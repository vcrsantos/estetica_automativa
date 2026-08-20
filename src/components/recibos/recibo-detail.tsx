"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { Ban, Download, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { ReciboPdf } from "@/components/recibos/recibo-pdf";
import { CancelarReciboDialog } from "@/components/recibos/cancelar-recibo-dialog";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import type { FormaPagamento, OrdemServico, Recibo, ReciboItem } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIPO_LABELS = { quitacao: "Quitação", sinal: "Sinal", parcial: "Parcial" } as const;

export function ReciboDetail({
  recibo,
  itens,
  osVinculadas,
  isAdmin,
}: {
  recibo: Recibo;
  itens: ReciboItem[];
  osVinculadas: OrdemServico[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [gerandoPdf, setGerandoPdf] = React.useState(false);
  const [dialogCancelarAberto, setDialogCancelarAberto] = React.useState(false);
  const cancelado = recibo.status === "cancelado";

  async function baixarPdf() {
    setGerandoPdf(true);
    try {
      const blob = await pdf(
        <ReciboPdf recibo={recibo} itens={itens} osVinculadas={osVinculadas} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recibo-${recibo.serie}-${String(recibo.numero).padStart(6, "0")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Recibo {recibo.serie}-{String(recibo.numero).padStart(6, "0")}
            </h1>
            <Badge variant={cancelado ? "destructive" : "success"}>
              {cancelado ? "Cancelado" : "Emitido"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {recibo.tomador_snapshot.nome_exibicao} · {formatarMoeda(recibo.valor)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={gerandoPdf} onClick={baixarPdf}>
            {gerandoPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Baixar PDF
          </Button>
          {isAdmin && !cancelado && (
            <Button variant="destructive" onClick={() => setDialogCancelarAberto(true)}>
              <Ban className="size-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {cancelado && (
        <Card className="max-w-lg border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Cancelado em {new Date(recibo.cancelado_em!).toLocaleDateString("pt-BR")}. Motivo:{" "}
            {recibo.motivo_cancelamento}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tomador</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{recibo.tomador_snapshot.nome_exibicao}</p>
            {recibo.tomador_snapshot.documento && <p>{recibo.tomador_snapshot.documento}</p>}
            {recibo.tomador_snapshot.endereco && (
              <p className="text-muted-foreground">{recibo.tomador_snapshot.endereco}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>Tipo: {TIPO_LABELS[recibo.tipo]}</p>
            <p>Forma: {FORMA_PAGAMENTO_LABELS[recibo.forma_pagamento as FormaPagamento] ?? recibo.forma_pagamento}</p>
            <p>Data: {new Date(recibo.data_pagamento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
            {osVinculadas.length > 0 && (
              <p>OS incluídas: {osVinculadas.map((os) => `#${os.numero}`).join(", ")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span>
                {item.descricao}
                {item.quantidade !== 1 ? ` (x${item.quantidade})` : ""}
              </span>
              <span className="font-medium">{formatarMoeda(item.valor_total)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>{formatarMoeda(recibo.valor)}</span>
          </div>
          <p className="pt-2 text-xs text-muted-foreground italic">{recibo.valor_extenso}</p>
          {recibo.observacoes && <p className="text-muted-foreground">{recibo.observacoes}</p>}
        </CardContent>
      </Card>

      <CancelarReciboDialog
        reciboId={recibo.id}
        open={dialogCancelarAberto}
        onOpenChange={setDialogCancelarAberto}
        onCancelado={() => router.refresh()}
      />
    </div>
  );
}
