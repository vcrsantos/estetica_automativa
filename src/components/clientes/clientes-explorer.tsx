"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { searchClientes } from "@/lib/clientes/search";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type CampoOrdenacao = "nome" | "telefone" | "cidade" | "criado_em";

function IconeOrdenacao({ ativo, asc }: { ativo: boolean; asc: boolean }) {
  if (!ativo) return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  return asc ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

function CabecalhoOrdenavel({
  campo,
  ordenarPor,
  ordemAsc,
  onOrdenar,
  children,
  className,
}: {
  campo: CampoOrdenacao;
  ordenarPor: CampoOrdenacao;
  ordemAsc: boolean;
  onOrdenar: (campo: CampoOrdenacao) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <IconeOrdenacao ativo={ordenarPor === campo} asc={ordemAsc} />
      </button>
    </TableHead>
  );
}

export function ClientesExplorer({
  initialClientes,
  termoInicial = "",
  isAdmin,
}: {
  initialClientes: Cliente[];
  termoInicial?: string;
  isAdmin: boolean;
}) {
  const [termo, setTermo] = React.useState(termoInicial);
  const [clientes, setClientes] = React.useState(initialClientes);
  const [carregando, setCarregando] = React.useState(false);
  const [cidadeFiltro, setCidadeFiltro] = React.useState("todas");
  const [ordenarPor, setOrdenarPor] = React.useState<CampoOrdenacao>("nome");
  const [ordemAsc, setOrdemAsc] = React.useState(true);
  const [excluindoId, setExcluindoId] = React.useState<string | null>(null);
  const termoDebounced = useDebouncedValue(termo, 300);
  const primeiraExecucao = React.useRef(true);

  async function excluirCliente(cliente: Cliente) {
    if (!window.confirm(`Excluir o cliente ${cliente.nome}? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoId(cliente.id);
    const supabase = createClient();
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    setExcluindoId(null);

    if (error) {
      if (error.code === "23503") {
        toast.error("Este cliente tem ordens de serviço ou orçamentos vinculados e não pode ser excluído.");
      } else {
        toast.error("Não foi possível excluir o cliente.");
      }
      return;
    }

    setClientes((atual) => atual.filter((c) => c.id !== cliente.id));
    toast.success("Cliente excluído.");
  }

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

  const cidades = React.useMemo(() => {
    const unicas = new Set(clientes.map((c) => c.cidade).filter((c): c is string => !!c));
    return Array.from(unicas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clientes]);

  const clientesExibidos = React.useMemo(() => {
    const filtrados =
      cidadeFiltro === "todas" ? clientes : clientes.filter((c) => c.cidade === cidadeFiltro);

    const comparados = [...filtrados].sort((a, b) => {
      let resultado = 0;
      if (ordenarPor === "criado_em") {
        resultado = new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
      } else {
        resultado = (a[ordenarPor] ?? "").localeCompare(b[ordenarPor] ?? "", "pt-BR");
      }
      return ordemAsc ? resultado : -resultado;
    });

    return comparados;
  }, [clientes, cidadeFiltro, ordenarPor, ordemAsc]);

  function alternarOrdenacao(campo: CampoOrdenacao) {
    if (ordenarPor === campo) {
      setOrdemAsc((v) => !v);
    } else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  }

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

      {cidades.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Cidade</span>
          <Select
            items={{ todas: "Todas", ...Object.fromEntries(cidades.map((c) => [c, c])) }}
            value={cidadeFiltro}
            onValueChange={(v) => setCidadeFiltro(v ?? "todas")}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {cidades.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={cn("rounded-md border", carregando && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <CabecalhoOrdenavel
                campo="nome"
                ordenarPor={ordenarPor}
                ordemAsc={ordemAsc}
                onOrdenar={alternarOrdenacao}
              >
                Nome
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                campo="telefone"
                ordenarPor={ordenarPor}
                ordemAsc={ordemAsc}
                onOrdenar={alternarOrdenacao}
              >
                Telefone
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                campo="cidade"
                ordenarPor={ordenarPor}
                ordemAsc={ordemAsc}
                onOrdenar={alternarOrdenacao}
                className="hidden sm:table-cell"
              >
                Cidade
              </CabecalhoOrdenavel>
              <CabecalhoOrdenavel
                campo="criado_em"
                ordenarPor={ordenarPor}
                ordemAsc={ordemAsc}
                onOrdenar={alternarOrdenacao}
                className="hidden sm:table-cell"
              >
                Cliente desde
              </CabecalhoOrdenavel>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!carregando && clientesExibidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}

            {!carregando &&
              clientesExibidos.map((cliente) => (
                <TableRow key={cliente.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                      {cliente.nome}
                    </Link>
                  </TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {cliente.cidade || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {new Date(cliente.criado_em).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar cliente"
                        render={<Link href={`/clientes/${cliente.id}`} />}
                        nativeButton={false}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir cliente"
                          className="text-destructive hover:text-destructive"
                          disabled={excluindoId === cliente.id}
                          onClick={() => excluirCliente(cliente)}
                        >
                          {excluindoId === cliente.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      )}
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
