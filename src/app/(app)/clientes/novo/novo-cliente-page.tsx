"use client";

import { useRouter } from "next/navigation";

import { ClienteForm } from "@/components/clientes/cliente-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NovoClientePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
        <p className="text-muted-foreground">Cadastro rápido — os veículos são adicionados depois.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
          <CardDescription>Nome e telefone são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClienteForm onSaved={(cliente) => router.push(`/clientes/${cliente.id}`)} />
        </CardContent>
      </Card>
    </div>
  );
}
