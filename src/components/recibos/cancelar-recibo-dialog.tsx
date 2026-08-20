"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Cancelamento (seção 5.6/2.1 do escopo de recibos) — motivo obrigatório, ação definitiva, o número fica queimado. */
export function CancelarReciboDialog({
  reciboId,
  open,
  onOpenChange,
  onCancelado,
}: {
  reciboId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelado: () => void;
}) {
  const [motivo, setMotivo] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function confirmar() {
    if (motivo.trim().length < 5) {
      toast.error("Descreva o motivo do cancelamento (mínimo 5 caracteres).");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancelar_recibo", {
      p_recibo: reciboId,
      p_motivo: motivo.trim(),
    });
    setEnviando(false);

    if (error) {
      toast.error(error.message || "Não foi possível cancelar o recibo.");
      return;
    }

    toast.success("Recibo cancelado.");
    setMotivo("");
    onOpenChange(false);
    onCancelado();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar recibo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Esta ação é definitiva. O número do recibo fica queimado e não pode ser reaproveitado;
            para corrigir, emita um novo recibo.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-cancelamento">Motivo do cancelamento</Label>
            <Textarea
              id="motivo-cancelamento"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explique por que este recibo está sendo cancelado"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={enviando} onClick={confirmar}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
