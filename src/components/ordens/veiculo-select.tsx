"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Veiculo } from "@/types/database";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VeiculoForm } from "@/components/clientes/veiculo-form";

export function VeiculoSelect({
  clienteId,
  veiculoSelecionadoId,
  onChange,
}: {
  clienteId: string;
  veiculoSelecionadoId: string | null;
  onChange: (veiculo: Veiculo | null) => void;
}) {
  const [veiculos, setVeiculos] = React.useState<Veiculo[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [dialogAberto, setDialogAberto] = React.useState(false);

  React.useEffect(() => {
    let cancelado = false;
    // Busca os veículos do cliente sempre que ele mudar — sincronização
    // com dado externo (banco), não é possível derivar isso durante o render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    const supabase = createClient();
    supabase
      .from("veiculos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        if (!cancelado) {
          setVeiculos(data ?? []);
          setCarregando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando veículos...</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-3 py-1.5 text-sm transition-colors",
          veiculoSelecionadoId === null
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:bg-accent"
        )}
      >
        Sem veículo
      </button>

      {veiculos.map((veiculo) => (
        <button
          key={veiculo.id}
          type="button"
          onClick={() => onChange(veiculo)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            veiculoSelecionadoId === veiculo.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          {veiculo.placa || veiculo.modelo || "Veículo"}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setDialogAberto(true)}
        className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
      >
        <Plus className="size-3.5" />
        Novo veículo
      </button>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo veículo</DialogTitle>
          </DialogHeader>
          <VeiculoForm
            clienteId={clienteId}
            onSaved={(veiculo) => {
              setVeiculos((atual) => [veiculo, ...atual]);
              onChange(veiculo);
              setDialogAberto(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
