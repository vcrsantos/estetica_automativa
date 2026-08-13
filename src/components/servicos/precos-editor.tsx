"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Preco, PorteVeiculo, Servico, Unidade } from "@/types/database";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PORTES: PorteVeiculo[] = ["pequeno", "medio", "grande", "moto"];

function chave(unidadeId: string, porte: PorteVeiculo | null) {
  return `${unidadeId}|${porte ?? "sem-porte"}`;
}

function CelulaPreco({
  valorInicial,
  salvando,
  onSalvar,
}: {
  valorInicial: string;
  salvando: boolean;
  onSalvar: (valor: string) => void;
}) {
  const [valor, setValor] = React.useState(valorInicial);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => onSalvar(valor)}
        inputMode="decimal"
        placeholder="0,00"
        className="pl-8"
        disabled={salvando}
      />
      {salvando && (
        <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export function PrecosEditor({
  servico,
  unidades,
  precosIniciais,
}: {
  servico: Servico;
  unidades: Unidade[];
  precosIniciais: Preco[];
}) {
  const [precos, setPrecos] = React.useState(precosIniciais);
  const [salvando, setSalvando] = React.useState<string | null>(null);

  function valorAtual(unidadeId: string, porte: PorteVeiculo | null) {
    const preco = precos.find((p) => p.unidade_id === unidadeId && p.porte === porte);
    return preco ? String(preco.valor) : "";
  }

  async function salvar(unidadeId: string, porte: PorteVeiculo | null, valorTexto: string) {
    const key = chave(unidadeId, porte);
    const valorNormalizado = valorTexto.trim().replace(",", ".");

    if (!valorNormalizado) return;

    const valor = Number(valorNormalizado);
    if (Number.isNaN(valor) || valor < 0) {
      toast.error("Valor inválido.");
      return;
    }

    const existente = precos.find((p) => p.unidade_id === unidadeId && p.porte === porte);
    if (existente && existente.valor === valor) return;

    setSalvando(key);
    const supabase = createClient();

    if (existente) {
      const { data, error } = await supabase
        .from("precos")
        .update({ valor })
        .eq("id", existente.id)
        .select("*")
        .single();

      setSalvando(null);
      if (error || !data) {
        toast.error("Não foi possível salvar o preço.");
        return;
      }
      setPrecos((atual) => atual.map((p) => (p.id === data.id ? data : p)));
      return;
    }

    const { data, error } = await supabase
      .from("precos")
      .insert({ servico_id: servico.id, unidade_id: unidadeId, porte, valor })
      .select("*")
      .single();

    setSalvando(null);
    if (error || !data) {
      toast.error("Não foi possível salvar o preço.");
      return;
    }
    setPrecos((atual) => [...atual, data]);
  }

  if (!servico.exige_veiculo) {
    return (
      <div className="flex flex-col gap-2">
        {unidades.map((unidade) => {
          const key = chave(unidade.id, null);
          return (
            <div key={unidade.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{unidade.nome}</span>
              <div className="w-32">
                <CelulaPreco
                  valorInicial={valorAtual(unidade.id, null)}
                  salvando={salvando === key}
                  onSalvar={(valor) => salvar(unidade.id, null, valor)}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Porte</TableHead>
            {unidades.map((unidade) => (
              <TableHead key={unidade.id}>{unidade.nome}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PORTES.map((porte) => (
            <TableRow key={porte}>
              <TableCell className="font-medium">{PORTE_LABELS[porte]}</TableCell>
              {unidades.map((unidade) => {
                const key = chave(unidade.id, porte);
                return (
                  <TableCell key={unidade.id} className="min-w-32">
                    <CelulaPreco
                      valorInicial={valorAtual(unidade.id, porte)}
                      salvando={salvando === key}
                      onSalvar={(valor) => salvar(unidade.id, porte, valor)}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
