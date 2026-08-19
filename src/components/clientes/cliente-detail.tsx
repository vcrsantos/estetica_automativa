"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente, Veiculo } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { VeiculoForm } from "@/components/clientes/veiculo-form";

export function ClienteDetail({
  cliente: clienteInicial,
  veiculos: veiculosIniciais,
  isAdmin,
}: {
  cliente: Cliente;
  veiculos: Veiculo[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [cliente, setCliente] = React.useState(clienteInicial);
  const [veiculos, setVeiculos] = React.useState(veiculosIniciais);
  const [editandoCliente, setEditandoCliente] = React.useState(false);
  const [dialogVeiculoAberto, setDialogVeiculoAberto] = React.useState(false);
  const [veiculoEmEdicao, setVeiculoEmEdicao] = React.useState<Veiculo | undefined>();
  const [excluindo, setExcluindo] = React.useState(false);

  async function excluirCliente() {
    if (!window.confirm(`Excluir o cliente ${cliente.nome}? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindo(true);
    const supabase = createClient();
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    setExcluindo(false);

    if (error) {
      if (error.code === "23503") {
        toast.error("Este cliente tem ordens de serviço ou orçamentos vinculados e não pode ser excluído.");
      } else {
        toast.error("Não foi possível excluir o cliente.");
      }
      return;
    }

    toast.success("Cliente excluído.");
    router.push("/clientes");
  }

  function abrirNovoVeiculo() {
    setVeiculoEmEdicao(undefined);
    setDialogVeiculoAberto(true);
  }

  function abrirEdicaoVeiculo(veiculo: Veiculo) {
    setVeiculoEmEdicao(veiculo);
    setDialogVeiculoAberto(true);
  }

  function onVeiculoSalvo(veiculo: Veiculo) {
    setVeiculos((atual) => {
      const existe = atual.some((v) => v.id === veiculo.id);
      return existe ? atual.map((v) => (v.id === veiculo.id ? veiculo : v)) : [veiculo, ...atual];
    });
    setDialogVeiculoAberto(false);
  }

  async function excluirVeiculo(veiculo: Veiculo) {
    if (!window.confirm(`Remover o veículo ${veiculo.placa || veiculo.modelo || ""}?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("veiculos").delete().eq("id", veiculo.id);

    if (error) {
      toast.error("Não foi possível remover o veículo.");
      return;
    }
    setVeiculos((atual) => atual.filter((v) => v.id !== veiculo.id));
    toast.success("Veículo removido.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
          <p className="text-muted-foreground">{cliente.telefone || "Sem telefone"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" render={<Link href="/clientes" />} nativeButton={false}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditandoCliente((v) => !v)}>
            {editandoCliente ? (
              "Cancelar"
            ) : (
              <>
                <Pencil className="size-4" />
                Editar
              </>
            )}
          </Button>
          {editandoCliente && (
            <Button variant="gradient" type="submit" form="cliente-edit-form" size="sm">
              <Save className="size-4" />
              Salvar
            </Button>
          )}
          {isAdmin && !editandoCliente && (
            <Button variant="destructive" size="sm" disabled={excluindo} onClick={excluirCliente}>
              {excluindo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir
            </Button>
          )}
        </div>
      </div>

      {editandoCliente ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Editar cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClienteForm
              cliente={cliente}
              onSaved={(atualizado) => {
                setCliente(atualizado);
                setEditandoCliente(false);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
            <InfoField label="E-mail" value={cliente.email} />
            <InfoField label="CPF/CNPJ" value={cliente.documento} />
            <InfoField label="Endereço" value={cliente.endereco} />
            <InfoField label="Cidade" value={cliente.cidade} />
            <InfoField label="Como conheceu" value={cliente.origem} />
            {cliente.observacoes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm">{cliente.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Car className="size-5" />
            Veículos
          </h2>
          <Button size="sm" onClick={abrirNovoVeiculo}>
            <Plus className="size-4" />
            Adicionar veículo
          </Button>
        </div>

        {veiculos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum veículo cadastrado. Serviços de higienização residencial não precisam de
            veículo associado.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {veiculos.map((veiculo) => (
              <Card key={veiculo.id}>
                <CardContent className="flex items-start justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">
                      {veiculo.placa || "Sem placa"} — {veiculo.marca} {veiculo.modelo}
                    </p>
                    <CardDescription>
                      {PORTE_LABELS[veiculo.porte]}
                      {veiculo.ano ? ` · ${veiculo.ano}` : ""}
                      {veiculo.cor ? ` · ${veiculo.cor}` : ""}
                    </CardDescription>
                    {veiculo.observacoes && (
                      <p className="mt-1 text-xs text-muted-foreground">{veiculo.observacoes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar veículo"
                      onClick={() => abrirEdicaoVeiculo(veiculo)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-destructive"
                    onClick={() => excluirVeiculo(veiculo)}
                  >
                    Remover
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogVeiculoAberto} onOpenChange={setDialogVeiculoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{veiculoEmEdicao ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          </DialogHeader>
          <VeiculoForm clienteId={cliente.id} veiculo={veiculoEmEdicao} onSaved={onVeiculoSalvo} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}
