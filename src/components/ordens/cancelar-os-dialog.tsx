"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { OrdemServico } from "@/types/database";
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

/**
 * "Excluir" na lista de histórico — a OS nunca é apagada de verdade (teria
 * que arrastar itens, fotos e qualquer recibo/prestação vinculados). É a
 * mesma ação de cancelar já existente no detalhe da OS, só exposta aqui
 * pra não precisar abrir a tela pra isso.
 */
export function CancelarOsDialog({
  os,
  onOpenChange,
  onCancelada,
}: {
  os: OrdemServico | null;
  onOpenChange: (open: boolean) => void;
  onCancelada: () => void;
}) {
  const [motivo, setMotivo] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function confirmar() {
    if (!os) return;
    if (!motivo.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("ordens_servico")
      .update({ status: "cancelado", motivo_cancelamento: motivo.trim() })
      .eq("id", os.id);
    setEnviando(false);

    if (error) {
      toast.error("Não foi possível cancelar a OS.");
      return;
    }

    toast.success("OS cancelada.");
    setMotivo("");
    onOpenChange(false);
    onCancelada();
  }

  return (
    <Dialog open={os !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir OS #{os?.numero}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            A OS não é apagada — fica marcada como cancelada, preservando o histórico e liberando
            os serviços para um novo recibo ou prestação de contas.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-exclusao-os">Motivo</Label>
            <Textarea
              id="motivo-exclusao-os"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={enviando} onClick={confirmar}>
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
