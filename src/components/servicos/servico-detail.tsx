"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ServicoForm } from "@/components/servicos/servico-form";
import { PrecosEditor } from "@/components/servicos/precos-editor";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Preco, Servico, Unidade } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ServicoDetail({
  servico: servicoInicial,
  unidades,
  precos,
  isAdmin,
}: {
  servico: Servico;
  unidades: Unidade[];
  precos: Preco[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [servico, setServico] = React.useState(servicoInicial);
  const [editando, setEditando] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState(false);

  async function excluirServico() {
    if (!window.confirm(`Excluir o serviço "${servico.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindo(true);
    const supabase = createClient();
    const { error } = await supabase.from("servicos").delete().eq("id", servico.id);
    setExcluindo(false);

    if (error) {
      if (error.code === "23503") {
        toast.error(
          "Este serviço já foi usado em ordens de serviço ou orçamentos e não pode ser excluído. Desative-o em vez disso."
        );
      } else {
        toast.error("Não foi possível excluir o serviço.");
      }
      return;
    }

    toast.success("Serviço excluído.");
    router.push("/servicos");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{servico.nome}</h1>
            <Badge variant={servico.ativo ? "success" : "outline"}>
              {servico.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{servico.categoria || "Sem categoria"}</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditando((v) => !v)}>
              {editando ? (
                "Cancelar"
              ) : (
                <>
                  <Pencil className="size-4" />
                  Editar
                </>
              )}
            </Button>
            {editando ? (
              <Button type="submit" form="servico-edit-form" size="sm">
                <Save className="size-4" />
                Salvar
              </Button>
            ) : (
              <Button variant="destructive" size="sm" disabled={excluindo} onClick={excluirServico}>
                {excluindo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {editando ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Editar serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ServicoForm
              servico={servico}
              onSaved={(atualizado) => {
                setServico(atualizado);
                setEditando(false);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Exige veículo</p>
              <p className="text-sm">{servico.exige_veiculo ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duração estimada</p>
              <p className="text-sm">
                {servico.duracao_min ? `${servico.duracao_min} min` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Intervalo ideal de retorno</p>
              <p className="text-sm">
                {servico.intervalo_retorno_dias ? `${servico.intervalo_retorno_dias} dias` : "—"}
              </p>
            </div>
            {servico.descricao && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm">{servico.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Preços por unidade{servico.exige_veiculo ? " e porte" : ""}</h2>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem alterar a tabela de preços.
            </p>
          )}
        </div>
        {isAdmin ? (
          <PrecosEditor servico={servico} unidades={unidades} precosIniciais={precos} />
        ) : (
          <PrecosSomenteLeitura servico={servico} unidades={unidades} precos={precos} />
        )}
      </div>
    </div>
  );
}

function PrecosSomenteLeitura({
  servico,
  unidades,
  precos,
}: {
  servico: Servico;
  unidades: Unidade[];
  precos: Preco[];
}) {
  function formatar(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (!servico.exige_veiculo) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        {unidades.map((unidade) => {
          const preco = precos.find((p) => p.unidade_id === unidade.id && p.porte === null);
          return (
            <div key={unidade.id} className="flex items-center justify-between">
              <span>{unidade.nome}</span>
              <span className="font-medium">{preco ? formatar(preco.valor) : "—"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      {unidades.map((unidade) => (
        <div key={unidade.id} className="rounded-md border p-3">
          <p className="mb-2 font-medium">{unidade.nome}</p>
          {precos
            .filter((p) => p.unidade_id === unidade.id)
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between text-muted-foreground">
                <span>{p.porte ? PORTE_LABELS[p.porte] : "—"}</span>
                <span>{formatar(p.valor)}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
