"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { valorPorExtenso } from "@/lib/valor-por-extenso";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import type { FormaPagamento } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Confirmar pagamento (seção 8 do escopo de prestação de contas) — gera um recibo de verdade por trás. */
export function ConfirmarPagamentoDialog({
  prestacaoId,
  valorTotal,
  open,
  onOpenChange,
  onConfirmado,
}: {
  prestacaoId: string;
  valorTotal: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmado: (reciboId: string) => void;
}) {
  const [formaPagamento, setFormaPagamento] = React.useState<FormaPagamento>("pix");
  const [dataPagamento, setDataPagamento] = React.useState(hojeIso);
  const [enviando, setEnviando] = React.useState(false);

  async function confirmar() {
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("confirmar_pagamento_prestacao", {
      p_prestacao: prestacaoId,
      p_forma_pagamento: formaPagamento,
      p_data_pagamento: dataPagamento,
      p_valor_extenso: valorPorExtenso(valorTotal),
    });
    setEnviando(false);

    if (error || !data) {
      toast.error(error?.message ?? "Não foi possível confirmar o pagamento.");
      return;
    }

    toast.success(`Pagamento confirmado — recibo #${data.numero} emitido.`);
    onOpenChange(false);
    onConfirmado(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar recebimento de {formatarMoeda(valorTotal)}?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Isso marca todas as OS desta prestação como pagas e emite um recibo de quitação.
          </p>
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <Select
              items={FORMA_PAGAMENTO_LABELS}
              value={formaPagamento}
              onValueChange={(v) => v && setFormaPagamento(v as FormaPagamento)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Confirmar recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
