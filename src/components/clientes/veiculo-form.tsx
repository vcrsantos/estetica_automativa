"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { PORTE_LABELS, veiculoSchema, type VeiculoFormValues } from "@/lib/validations/cliente";
import type { Veiculo } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VeiculoForm({
  clienteId,
  veiculo,
  onSaved,
}: {
  clienteId: string;
  veiculo?: Veiculo;
  onSaved: (veiculo: Veiculo) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: veiculo
      ? {
          placa: veiculo.placa ?? "",
          marca: veiculo.marca ?? "",
          modelo: veiculo.modelo ?? "",
          ano: veiculo.ano ? String(veiculo.ano) : "",
          cor: veiculo.cor ?? "",
          porte: veiculo.porte,
          observacoes: veiculo.observacoes ?? "",
        }
      : { porte: "medio" },
  });

  async function onSubmit(values: VeiculoFormValues) {
    const supabase = createClient();
    const payload = {
      placa: values.placa ? values.placa.toUpperCase() : null,
      marca: values.marca || null,
      modelo: values.modelo || null,
      ano: values.ano ? Number(values.ano) : null,
      cor: values.cor || null,
      porte: values.porte,
      observacoes: values.observacoes || null,
    };

    if (veiculo) {
      const { data, error } = await supabase
        .from("veiculos")
        .update(payload)
        .eq("id", veiculo.id)
        .select("*")
        .single();

      if (error || !data) {
        toast.error("Não foi possível salvar as alterações do veículo.");
        return;
      }
      toast.success("Veículo atualizado.");
      onSaved(data);
      return;
    }

    const { data, error } = await supabase
      .from("veiculos")
      .insert({ ...payload, cliente_id: clienteId })
      .select("*")
      .single();

    if (error || !data) {
      toast.error("Não foi possível cadastrar o veículo.");
      return;
    }
    toast.success("Veículo cadastrado.");
    onSaved(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="placa">Placa</Label>
          <Input id="placa" className="uppercase" {...register("placa")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="porte">Porte</Label>
          <Controller
            control={control}
            name="porte"
            render={({ field }) => (
              <Select items={PORTE_LABELS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="porte">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PORTE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.porte && <p className="text-sm text-destructive">{errors.porte.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" {...register("marca")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input id="modelo" {...register("modelo")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ano">Ano</Label>
          <Input id="ano" type="number" inputMode="numeric" {...register("ano")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cor">Cor</Label>
          <Input id="cor" {...register("cor")} />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            rows={2}
            placeholder="Ex.: pintura sensível, já teve polimento em..."
            {...register("observacoes")}
          />
        </div>
      </div>

      <Button variant="gradient" type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {veiculo ? "Salvar alterações" : "Cadastrar veículo"}
      </Button>
    </form>
  );
}
