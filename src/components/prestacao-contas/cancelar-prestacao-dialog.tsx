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

/** Cancelamento de prestação em aberto — libera as OS, preserva o registro (motivo obrigatório). */
export function CancelarPrestacaoDialog({
  prestacaoId,
  open,
  onOpenChange,
  onCancelada,
}: {
  prestacaoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelada: () => void;
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
    const { error } = await supabase.rpc("cancelar_prestacao_conta", {
      p_prestacao: prestacaoId,
      p_motivo: motivo.trim(),
    });
    setEnviando(false);

    if (error) {
      toast.error(error.message || "Não foi possível cancelar.");
      return;
    }

    toast.success("Prestação de contas cancelada.");
    setMotivo("");
    onOpenChange(false);
    onCancelada();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar prestação de contas</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Os serviços incluídos voltam a ficar disponíveis para outra prestação ou recibo.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-cancelamento-prestacao">Motivo do cancelamento</Label>
            <Textarea
              id="motivo-cancelamento-prestacao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explique por que esta prestação está sendo cancelada"
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
