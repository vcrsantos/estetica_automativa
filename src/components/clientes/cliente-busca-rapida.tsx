"use client";

import * as React from "react";
import { Search, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { searchClientes } from "@/lib/clientes/search";
import type { Cliente } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClienteForm } from "@/components/clientes/cliente-form";

/**
 * Campo de busca de cliente com resultado instantâneo (nome, telefone ou
 * placa) e cadastro rápido embutido — pensado para ser reutilizado na tela de
 * nova Ordem de Serviço (requisito de abrir uma OS em até 30 segundos).
 */
export function ClienteBuscaRapida({
  onSelecionar,
  placeholder = "Buscar cliente por nome, telefone ou placa",
}: {
  onSelecionar: (cliente: Cliente) => void;
  placeholder?: string;
}) {
  const [termo, setTermo] = React.useState("");
  const [resultados, setResultados] = React.useState<Cliente[]>([]);
  const [aberto, setAberto] = React.useState(false);
  const [dialogNovoAberto, setDialogNovoAberto] = React.useState(false);

  React.useEffect(() => {
    if (!termo.trim()) {
      return;
    }

    let cancelado = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const dados = await searchClientes(supabase, termo, 8);
      if (!cancelado) setResultados(dados);
    }, 250);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [termo]);

  function selecionar(cliente: Cliente) {
    onSelecionar(cliente);
    setTermo("");
    setResultados([]);
    setAberto(false);
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>

      {aberto && termo.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {resultados.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onMouseDown={() => selecionar(cliente)}
              className="flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span className="font-medium">{cliente.nome}</span>
              <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
            </button>
          ))}

          {resultados.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start"
            onMouseDown={() => setDialogNovoAberto(true)}
          >
            <UserPlus className="size-4" />
            Cadastrar novo cliente
          </Button>
        </div>
      )}

      <Dialog open={dialogNovoAberto} onOpenChange={setDialogNovoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            onSaved={(cliente) => {
              setDialogNovoAberto(false);
              selecionar(cliente);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
