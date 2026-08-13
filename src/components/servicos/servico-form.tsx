"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { servicoSchema, type ServicoFormValues } from "@/lib/validations/servico";
import type { Servico } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function ServicoForm({
  servico,
  onSaved,
}: {
  servico?: Servico;
  onSaved: (servico: Servico) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoSchema),
    defaultValues: servico
      ? {
          nome: servico.nome,
          descricao: servico.descricao ?? "",
          categoria: servico.categoria ?? "",
          exige_veiculo: servico.exige_veiculo,
          duracao_min: servico.duracao_min ? String(servico.duracao_min) : "",
          intervalo_retorno_dias: servico.intervalo_retorno_dias
            ? String(servico.intervalo_retorno_dias)
            : "",
          ativo: servico.ativo,
        }
      : { exige_veiculo: true, ativo: true },
  });

  async function onSubmit(values: ServicoFormValues) {
    const supabase = createClient();
    const payload = {
      nome: values.nome,
      descricao: values.descricao || null,
      categoria: values.categoria || null,
      exige_veiculo: values.exige_veiculo,
      duracao_min: values.duracao_min ? Number(values.duracao_min) : null,
      intervalo_retorno_dias: values.intervalo_retorno_dias
        ? Number(values.intervalo_retorno_dias)
        : null,
      ativo: values.ativo,
    };

    if (servico) {
      const { data, error } = await supabase
        .from("servicos")
        .update(payload)
        .eq("id", servico.id)
        .select("*")
        .single();

      if (error || !data) {
        toast.error("Não foi possível salvar as alterações.");
        return;
      }
      toast.success("Serviço atualizado.");
      onSaved(data);
      return;
    }

    const { data, error } = await supabase.from("servicos").insert(payload).select("*").single();

    if (error || !data) {
      toast.error("Não foi possível cadastrar o serviço.");
      return;
    }
    toast.success("Serviço cadastrado.");
    onSaved(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do serviço</Label>
          <Input id="nome" autoFocus {...register("nome")} />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" placeholder="Lavagem, Polimento..." {...register("categoria")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="duracao_min">Duração estimada (minutos)</Label>
          <Input id="duracao_min" type="number" inputMode="numeric" {...register("duracao_min")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="intervalo_retorno_dias">Intervalo ideal de retorno (dias)</Label>
          <Input
            id="intervalo_retorno_dias"
            type="number"
            inputMode="numeric"
            placeholder="Ex.: 15"
            {...register("intervalo_retorno_dias")}
          />
          <p className="text-xs text-muted-foreground">Usado no alerta de reativação de clientes.</p>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div>
            <Label htmlFor="exige_veiculo">Exige veículo</Label>
            <p className="text-xs text-muted-foreground">Desligue para serviços como higienização residencial.</p>
          </div>
          <Controller
            control={control}
            name="exige_veiculo"
            render={({ field }) => (
              <Switch id="exige_veiculo" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {servico && (
          <div className="flex items-center justify-between gap-2 rounded-md border p-3">
            <div>
              <Label htmlFor="ativo">Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Desative para ocultar sem apagar o histórico.
              </p>
            </div>
            <Controller
              control={control}
              name="ativo"
              render={({ field }) => (
                <Switch id="ativo" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição curta</Label>
          <Textarea id="descricao" rows={2} {...register("descricao")} />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {servico ? "Salvar alterações" : "Cadastrar serviço"}
      </Button>
    </form>
  );
}
