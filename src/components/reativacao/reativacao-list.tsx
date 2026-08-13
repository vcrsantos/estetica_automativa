"use client";

import * as React from "react";
import { CheckCircle2, ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { ESTILOS_MENSAGEM, montarMensagemReativacao } from "@/lib/reativacao-mensagens";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { ClienteParaReativar } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function abrirWhatsApp(cliente: ClienteParaReativar, estilo: Parameters<typeof montarMensagemReativacao>[0]) {
  const primeiroNome = cliente.nome.split(" ")[0];
  const mensagem = montarMensagemReativacao(estilo, primeiroNome);
  window.open(linkWhatsApp(cliente.telefone, mensagem), "_blank", "noopener,noreferrer");
}

export function ReativacaoList() {
  const { unidadeSelecionadaId } = useUnidade();
  const [clientes, setClientes] = React.useState<ClienteParaReativar[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [marcando, setMarcando] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("clientes_para_reativar", {
        p_unidade_id: unidadeSelecionadaId,
      });
      if (!cancelado) {
        setClientes(data ?? []);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  async function marcarContatoRealizado(cliente: ClienteParaReativar) {
    setMarcando(cliente.cliente_id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("contatos_reativacao").insert({
      cliente_id: cliente.cliente_id,
      usuario_id: user?.id ?? null,
      canal: "whatsapp",
    });

    setMarcando(null);
    if (error) {
      toast.error("Não foi possível registrar o contato.");
      return;
    }
    setClientes((atual) => atual.filter((c) => c.cliente_id !== cliente.cliente_id));
    toast.success("Contato registrado.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes para reativar</h1>
        <p className="text-muted-foreground">
          Clientes que passaram do prazo ideal de retorno do último serviço, ordenados pelo maior
          valor já gasto.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden sm:table-cell">Último serviço</TableHead>
              <TableHead className="hidden sm:table-cell">Valor gasto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
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
                  Nenhum cliente para reativar no momento.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              clientes.map((cliente) => (
                <TableRow key={cliente.cliente_id}>
                  <TableCell>
                    <p className="font-medium">{cliente.nome}</p>
                    <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <p>
                      {new Date(cliente.ultimo_atendimento).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      há {cliente.dias_desde_ultimo} dias
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatarMoeda(cliente.valor_total_gasto)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                          <MessageCircle className="size-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                          <ChevronDown className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ESTILOS_MENSAGEM.map((estilo) => (
                            <DropdownMenuItem
                              key={estilo.id}
                              onClick={() => abrirWhatsApp(cliente, estilo.id)}
                            >
                              {estilo.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={marcando === cliente.cliente_id}
                        onClick={() => marcarContatoRealizado(cliente)}
                      >
                        <CheckCircle2 className="size-4" />
                        <span className="hidden sm:inline">Contato feito</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
