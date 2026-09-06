"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { useUnidade } from "@/components/providers/unidade-provider";
import { FORMA_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import type { Despesa, FinanceiroResumo, FormaPagamento } from "@/types/database";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarListChart } from "@/components/dashboard/bar-list-chart";
import { DonutChart, agruparTopCategorias } from "@/components/dashboard/donut-chart";
import { NovaDespesaDialog } from "@/components/financeiro/nova-despesa-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinanceiroContent({ podeEditar }: { podeEditar: boolean }) {
  const { unidadeSelecionadaId, unidades } = useUnidade();
  const [resumo, setResumo] = React.useState<FinanceiroResumo | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();
      const { data } = await supabase.rpc("financeiro_resumo", {
        p_unidade_id: unidadeSelecionadaId,
      });
      if (!cancelado) {
        setResumo(data);
        setCarregando(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  function adicionarDespesa(despesa: Despesa) {
    setResumo((atual) => {
      if (!atual) return atual;
      return {
        ...atual,
        saidas_mes: atual.saidas_mes + despesa.valor,
        despesas_mes: [
          {
            id: despesa.id,
            categoria: despesa.categoria,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: despesa.data,
          },
          ...atual.despesas_mes,
        ],
      };
    });
  }

  if (carregando || !resumo) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Caixa do dia, resultado do mês e comissões.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const resultadoMes = resumo.entradas_mes - resumo.saidas_mes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Caixa do dia, resultado do mês e comissões.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard titulo="Caixa de hoje" valor={formatarMoeda(resumo.caixa_hoje_total)} />
          <StatCard titulo="Entradas do mês" valor={formatarMoeda(resumo.entradas_mes)} />
          <StatCard titulo="Saídas do mês" valor={formatarMoeda(resumo.saidas_mes)} />
          <StatCard
            titulo="Resultado do mês"
            valor={formatarMoeda(resultadoMes)}
            tom={resultadoMes >= 0 ? "positivo" : "negativo"}
          />
        </div>

        <BarListChart
          titulo="Comissões do mês por executor"
          dados={resumo.comissoes_mes.map((c) => ({
            label: c.nome,
            valor: c.comissao,
            sublabel: `${c.comissao_percentual ?? 0}% de ${formatarMoeda(c.valor_gerado)}`,
          }))}
          formatarValor={formatarMoeda}
          vazio="Nenhum executor ativo cadastrado."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Despesas do mês</CardTitle>
            {podeEditar && (
              <NovaDespesaDialog
                unidades={unidades}
                unidadeSelecionadaId={unidadeSelecionadaId}
                onCriada={adicionarDespesa}
              />
            )}
          </CardHeader>
          <CardContent>
            {resumo.despesas_mes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma despesa lançada este mês.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.despesas_mes.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>{d.categoria}</TableCell>
                        <TableCell className="text-muted-foreground">{d.descricao ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatarMoeda(d.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <DonutChart
          titulo="Caixa de hoje por forma de pagamento"
          dados={agruparTopCategorias(
            resumo.caixa_hoje_por_forma.map((f) => ({
              label:
                f.forma_pagamento === "nao_informado"
                  ? "Não informado"
                  : FORMA_PAGAMENTO_LABELS[f.forma_pagamento as FormaPagamento],
              valor: f.valor,
            }))
          )}
          formatarValor={formatarMoeda}
          vazio="Nenhum recebimento hoje ainda."
        />
      </div>
    </div>
  );
}
