"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { clienteSchema, type ClienteFormValues } from "@/lib/validations/cliente";
import type { Cliente } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClienteForm({
  cliente,
  onSaved,
}: {
  cliente?: Cliente;
  onSaved: (cliente: Cliente) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email ?? "",
          documento: cliente.documento ?? "",
          endereco: cliente.endereco ?? "",
          cidade: cliente.cidade ?? "",
          origem: cliente.origem ?? "",
          observacoes: cliente.observacoes ?? "",
        }
      : {},
  });

  async function onSubmit(values: ClienteFormValues) {
    const supabase = createClient();
    const payload = {
      nome: values.nome,
      telefone: values.telefone,
      email: values.email || null,
      documento: values.documento || null,
      endereco: values.endereco || null,
      cidade: values.cidade || null,
      origem: values.origem || null,
      observacoes: values.observacoes || null,
    };

    if (cliente) {
      const { data, error } = await supabase
        .from("clientes")
        .update(payload)
        .eq("id", cliente.id)
        .select("*")
        .single();

      if (error || !data) {
        console.error(error);
        toast.error(error ? `Não foi possível salvar as alterações: ${error.message}` : "Não foi possível salvar as alterações.");
        return;
      }
      toast.success("Cliente atualizado.");
      onSaved(data);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("clientes")
      .insert({ ...payload, criado_por: user?.id ?? null })
      .select("*")
      .single();

    if (error || !data) {
      console.error(error);
      toast.error(error ? `Não foi possível cadastrar o cliente: ${error.message}` : "Não foi possível cadastrar o cliente.");
      return;
    }
    toast.success("Cliente cadastrado.");
    onSaved(data);
  }

  return (
    <form id="cliente-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="nome">Nome / razão social</Label>
          <Input id="nome" autoFocus {...register("nome")} />
          {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
          <Input id="telefone" placeholder="(99) 99999-9999" {...register("telefone")} />
          {errors.telefone && (
            <p className="text-sm text-destructive">{errors.telefone.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="documento">CPF / CNPJ</Label>
          <Input id="documento" {...register("documento")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" {...register("endereco")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register("cidade")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="origem">Como conheceu a POLIBRILHO</Label>
          <Input id="origem" placeholder="Instagram, indicação..." {...register("origem")} />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" rows={3} {...register("observacoes")} />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {cliente ? "Salvar alterações" : "Salvar"}
      </Button>
    </form>
  );
}
