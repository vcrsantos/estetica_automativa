"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Car, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  ORIGEM_OPCOES,
  PORTE_LABELS,
  clienteSchema,
  veiculoSchema,
  type ClienteFormValues,
  type VeiculoFormValues,
} from "@/lib/validations/cliente";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type VeiculoPendente = VeiculoFormValues & { chaveLocal: string };

function VeiculoDraftForm({
  onAdicionar,
}: {
  onAdicionar: (veiculo: VeiculoFormValues) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: { porte: "medio" },
  });

  function aoAdicionar(values: VeiculoFormValues) {
    onAdicionar(values);
    reset({ porte: "medio" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-placa">Placa</Label>
          <Input id="veiculo-placa" className="uppercase" {...register("placa")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-porte">Porte</Label>
          <Controller
            control={control}
            name="porte"
            render={({ field }) => (
              <Select items={PORTE_LABELS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="veiculo-porte" className="w-full">
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
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-marca">Marca</Label>
          <Input id="veiculo-marca" {...register("marca")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-modelo">Modelo</Label>
          <Input id="veiculo-modelo" {...register("modelo")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-ano">Ano</Label>
          <Input id="veiculo-ano" type="number" inputMode="numeric" {...register("ano")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="veiculo-cor">Cor</Label>
          <Input id="veiculo-cor" {...register("cor")} />
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={handleSubmit(aoAdicionar)}>
        <Plus className="size-4" />
        Adicionar veículo
      </Button>
    </div>
  );
}

export function NovoClientePage() {
  const router = useRouter();
  const [veiculos, setVeiculos] = React.useState<VeiculoPendente[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
  });

  function adicionarVeiculo(veiculo: VeiculoFormValues) {
    setVeiculos((atual) => [...atual, { ...veiculo, chaveLocal: crypto.randomUUID() }]);
  }

  function removerVeiculo(chaveLocal: string) {
    setVeiculos((atual) => atual.filter((v) => v.chaveLocal !== chaveLocal));
  }

  async function onSubmit(values: ClienteFormValues) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .insert({
        nome: values.nome,
        telefone: values.telefone || null,
        email: values.email || null,
        documento: values.documento || null,
        endereco: values.endereco || null,
        cidade: values.cidade || null,
        origem: values.origem || null,
        observacoes: values.observacoes || null,
        criado_por: user?.id ?? null,
      })
      .select("*")
      .single();

    if (erroCliente || !cliente) {
      console.error(erroCliente);
      toast.error(
        erroCliente
          ? `Não foi possível cadastrar o cliente: ${erroCliente.message}`
          : "Não foi possível cadastrar o cliente."
      );
      return;
    }

    if (veiculos.length > 0) {
      const { error: erroVeiculos } = await supabase.from("veiculos").insert(
        veiculos.map((v) => ({
          cliente_id: cliente.id,
          placa: v.placa ? v.placa.toUpperCase() : null,
          marca: v.marca || null,
          modelo: v.modelo || null,
          ano: v.ano ? Number(v.ano) : null,
          cor: v.cor || null,
          porte: v.porte,
          observacoes: v.observacoes || null,
        }))
      );

      if (erroVeiculos) {
        console.error(erroVeiculos);
        toast.error("Cliente cadastrado, mas houve um problema ao salvar os veículos.");
        router.push("/clientes");
        return;
      }
    }

    toast.success("Cliente cadastrado.");
    router.push("/clientes");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
          <p className="text-muted-foreground">Cadastre o cliente e, se quiser, os veículos dele.</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/clientes" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
            <CardDescription>Apenas o nome é obrigatório.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="nome">Nome / razão social</Label>
                <Input id="nome" autoFocus {...register("nome")} />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                <Input id="telefone" placeholder="(99) 99999-9999 — opcional" {...register("telefone")} />
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
                <Controller
                  control={control}
                  name="origem"
                  render={({ field }) => (
                    <Select
                      items={Object.fromEntries(ORIGEM_OPCOES.map((o) => [o, o]))}
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v ?? "")}
                    >
                      <SelectTrigger id="origem" className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGEM_OPCOES.map((opcao) => (
                          <SelectItem key={opcao} value={opcao}>
                            {opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" rows={3} {...register("observacoes")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="size-5" />
              Veículos (opcional)
            </CardTitle>
            <CardDescription>
              Adicione um ou mais veículos agora, ou deixe para cadastrar depois na ficha do cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {veiculos.length > 0 && (
              <div className="flex flex-col gap-2">
                {veiculos.map((veiculo) => (
                  <div
                    key={veiculo.chaveLocal}
                    className="flex items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {veiculo.placa || "Sem placa"} — {veiculo.marca} {veiculo.modelo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PORTE_LABELS[veiculo.porte]}
                        {veiculo.ano ? ` · ${veiculo.ano}` : ""}
                        {veiculo.cor ? ` · ${veiculo.cor}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover veículo"
                      onClick={() => removerVeiculo(veiculo.chaveLocal)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <VeiculoDraftForm onAdicionar={adicionarVeiculo} />
          </CardContent>
        </Card>

        <Button variant="gradient" type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </form>
    </div>
  );
}
