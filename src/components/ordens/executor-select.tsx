"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Executor } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExecutorSelect({
  unidadeId,
  selecionados,
  onChange,
}: {
  unidadeId: string;
  selecionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const [executores, setExecutores] = React.useState<Executor[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [novoNome, setNovoNome] = React.useState("");
  const [adicionando, setAdicionando] = React.useState(false);
  const [mostrarNovo, setMostrarNovo] = React.useState(false);

  const carregarExecutores = React.useCallback(async () => {
    if (!unidadeId) {
      setExecutores([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("executores")
      .select("*")
      .eq("unidade_id", unidadeId)
      .eq("ativo", true)
      .order("nome");
    setExecutores(data ?? []);
    setCarregando(false);
  }, [unidadeId]);

  React.useEffect(() => {
    // Busca os executores da unidade sempre que ela mudar — sincronização
    // com dado externo (banco), não é possível derivar isso durante o render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarExecutores();
  }, [carregarExecutores]);

  function alternar(id: string) {
    onChange(
      selecionados.includes(id)
        ? selecionados.filter((s) => s !== id)
        : [...selecionados, id]
    );
  }

  async function adicionarExecutor() {
    if (!novoNome.trim() || !unidadeId) return;
    setAdicionando(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("executores")
      .insert({ nome: novoNome.trim(), unidade_id: unidadeId })
      .select("*")
      .single();
    setAdicionando(false);

    if (error || !data) {
      toast.error("Não foi possível cadastrar o executor.");
      return;
    }
    setExecutores((atual) => [...atual, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    onChange([...selecionados, data.id]);
    setNovoNome("");
    setMostrarNovo(false);
  }

  if (carregando) {
    return <p className="text-sm text-muted-foreground">Carregando executores...</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {executores.map((executor) => {
          const ativo = selecionados.includes(executor.id);
          return (
            <button
              key={executor.id}
              type="button"
              onClick={() => alternar(executor.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                ativo
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent"
              )}
            >
              {executor.nome}
            </button>
          );
        })}

        {executores.length === 0 && !mostrarNovo && (
          <p className="text-sm text-muted-foreground">Nenhum executor cadastrado nesta unidade.</p>
        )}

        {!mostrarNovo && (
          <button
            type="button"
            onClick={() => setMostrarNovo(true)}
            className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="size-3.5" />
            Novo executor
          </button>
        )}
      </div>

      {mostrarNovo && (
        <div className="flex items-center gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do executor"
            className="h-8 max-w-48"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarExecutor();
              }
            }}
          />
          <Button type="button" size="sm" disabled={adicionando} onClick={adicionarExecutor}>
            Adicionar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarNovo(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
