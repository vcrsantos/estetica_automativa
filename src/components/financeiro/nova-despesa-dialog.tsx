"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIAS_DESPESA_SUGERIDAS,
  novaDespesaSchema,
  type NovaDespesaFormValues,
} from "@/lib/validations/despesa";
import type { Despesa, Unidade } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Data local (YYYY-MM-DD) sem o deslocamento de fuso que toISOString() traria. */
function hojeIso() {
  const agora = new Date();
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return semFuso.toISOString().slice(0, 10);
}

export function NovaDespesaDialog({
  unidades,
  unidadeSelecionadaId,
  onCriada,
}: {
  unidades: Unidade[];
  unidadeSelecionadaId: string | null;
  onCriada: (despesa: Despesa) => void;
}) {
  const [aberto, setAberto] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NovaDespesaFormValues>({
    resolver: zodResolver(novaDespesaSchema),
    defaultValues: {
      unidade_id: unidadeSelecionadaId ?? "",
      categoria: "",
      descricao: "",
      valor: "",
      data: hojeIso(),
    },
  });

  async function onSubmit(values: NovaDespesaFormValues) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("despesas")
      .insert({
        unidade_id: values.unidade_id,
        categoria: values.categoria,
        descricao: values.descricao || null,
        valor: Number(values.valor.replace(",", ".")),
        data: values.data,
      })
      .select("*")
      .single();

    if (error || !data) {
      toast.error("Não foi possível lançar a despesa.");
      return;
    }

    toast.success("Despesa lançada.");
    onCriada(data);
    reset({
      unidade_id: values.unidade_id,
      categoria: "",
      descricao: "",
      valor: "",
      data: hojeIso(),
    });
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nova despesa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar despesa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {unidades.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="unidade_id">Unidade</Label>
              <Controller
                control={control}
                name="unidade_id"
                render={({ field }) => (
                  <Select
                    items={Object.fromEntries(unidades.map((u) => [u.id, u.nome]))}
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "")}
                  >
                    <SelectTrigger id="unidade_id">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unidade_id && (
                <p className="text-sm text-destructive">{errors.unidade_id.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              list="categorias-despesa"
              placeholder="Produtos, Água, Energia..."
              {...register("categoria")}
            />
            <datalist id="categorias-despesa">
              {CATEGORIAS_DESPESA_SUGERIDAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.categoria && (
              <p className="text-sm text-destructive">{errors.categoria.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" {...register("descricao")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" inputMode="decimal" placeholder="0,00" {...register("valor")} />
              {errors.valor && <p className="text-sm text-destructive">{errors.valor.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" {...register("data")} />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Lançar despesa
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
