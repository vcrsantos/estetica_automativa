"use client";

import { useRouter } from "next/navigation";

import { ServicoForm } from "@/components/servicos/servico-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NovoServicoPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo serviço</h1>
        <p className="text-muted-foreground">Os preços por unidade e porte são definidos depois.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do serviço</CardTitle>
          <CardDescription>Nome é obrigatório.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServicoForm onSaved={(servico) => router.push(`/servicos/${servico.id}`)} />
        </CardContent>
      </Card>
    </div>
  );
}
