"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { searchClientes } from "@/lib/clientes/search";
import { ETIQUETA_LABELS } from "@/lib/validations/cliente";
import type { Cliente } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function ClientesExplorer({ initialClientes }: { initialClientes: Cliente[] }) {
  const [termo, setTermo] = React.useState("");
  const [clientes, setClientes] = React.useState(initialClientes);
  const [carregando, setCarregando] = React.useState(false);
  const termoDebounced = useDebouncedValue(termo, 300);
  const primeiraExecucao = React.useRef(true);

  React.useEffect(() => {
    if (primeiraExecucao.current) {
      primeiraExecucao.current = false;
      return;
    }

    let cancelado = false;
    setCarregando(true);
    const supabase = createClient();

    searchClientes(supabase, termoDebounced, 30).then((resultado) => {
      if (!cancelado) {
        setClientes(resultado);
        setCarregando(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [termoDebounced]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome, telefone ou placa"
            className="pl-8"
          />
        </div>
        <Button render={<Link href="/clientes/novo" />} nativeButton={false} className="w-full sm:w-fit">
          <UserPlus className="size-4" />
          Novo cliente
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden sm:table-cell">Etiqueta</TableHead>
              <TableHead className="hidden sm:table-cell">Cliente desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              clientes.map((cliente) => (
                <TableRow key={cliente.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                      {cliente.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={cliente.etiqueta === "vip" ? "default" : "outline"}>
                      {ETIQUETA_LABELS[cliente.etiqueta]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {new Date(cliente.criado_em).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
