"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { calcularVariacao, formatarVariacao } from "@/lib/dashboard-variacao";
import { contarDiasOperacao, mesReferencia } from "@/lib/dias-operacao";
import type { PeriodoSelecionado } from "@/lib/dashboard-periodo";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { DashboardResumo, Unidade } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Faturamento do mês — hero da linha de KPIs (seção 4.1 das melhorias).
 * Fundo passa a ser o token `bg-card` (não mais amarelo sólido): o amarelo
 * fica reservado a acento — ícone, brilho radial discreto e barra de
 * progresso —, deixando o cartão consistente com os demais em vez de
 * competir por atenção com o resto da tela.
 */
export function MetaFaturamentoCard({
  resumo,
  isAdmin,
  periodo,
}: {
  resumo: DashboardResumo;
  isAdmin: boolean;
  /** O "mês" deste card segue o mês de `periodo.fim` — mesmo mês real na maioria dos filtros, mas acompanha um período personalizado num mês passado. */
  periodo: PeriodoSelecionado;
}) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const [dialogAberto, setDialogAberto] = React.useState(false);

  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;
  const meta = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);
  const temMeta = meta > 0;

  const { ano, mes, dia: diaAtual, mesLabel } = mesReferencia(periodo);
  const diasOperacaoTotal = contarDiasOperacao(ano, mes);
  const diasOperacaoDecorridos = Math.min(diasOperacaoTotal, contarDiasOperacao(ano, mes, diaAtual));
  const diasOperacaoRestantes = Math.max(0, diasOperacaoTotal - diasOperacaoDecorridos);
  const progressoEsperado = diasOperacaoTotal > 0 ? (diasOperacaoDecorridos / diasOperacaoTotal) * 100 : 0;

  const projecao =
    diasOperacaoDecorridos > 0
      ? (resumo.mes.faturamento / diasOperacaoDecorridos) * diasOperacaoTotal
      : 0;
  const progresso = temMeta ? Math.min(100, (resumo.mes.faturamento / meta) * 100) : 0;
  const valorRestante = Math.max(0, meta - resumo.mes.faturamento);
  const metaJaAtingida = temMeta && resumo.mes.faturamento >= meta;
  const ritmoNecessario = diasOperacaoRestantes > 0 ? valorRestante / diasOperacaoRestantes : 0;

  const infoVariacao = formatarVariacao(
    calcularVariacao(resumo.mes.faturamento, resumo.mes_anterior.faturamento),
    formatarMoeda,
    "mês"
  );

  const unidadeUnica = unidadeSelecionadaId
    ? (unidades.find((u) => u.id === unidadeSelecionadaId) ?? null)
    : null;

  const [prefixo, ...resto] = formatarMoeda(resumo.mes.faturamento).split(/(?<=^R\$)\s*/);

  return (
    <Card className="relative h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--chart-1) 14%, transparent), transparent 55%)",
        }}
      />
      <CardContent className="relative flex h-full flex-col gap-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--chart-1)]/20 text-[#8a6a00] dark:text-[#ffd600]">
              <TrendingUp className="size-4.5" />
            </div>
            <p className="text-sm font-medium text-foreground">Faturamento de {mesLabel}</p>
          </div>
          {isAdmin && unidadeUnica && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Configurar meta e capacidade"
              onClick={() => setDialogAberto(true)}
            >
              <Settings2 className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-heading tabular-nums">
            <span className="text-xl font-medium text-muted-foreground">{prefixo}</span>
            <span className="text-[44px] leading-none font-semibold tracking-tight text-foreground">
              {resto.join("")}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                infoVariacao.tom === "positivo" &&
                  "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
                infoVariacao.tom === "negativo" &&
                  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
                infoVariacao.tom === "neutro" && "bg-muted text-muted-foreground"
              )}
            >
              {infoVariacao.texto}
            </span>
            {!infoVariacao.indisponivel && (
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            )}
            {temMeta && (
              <span className="rounded-full bg-[var(--chart-1)]/20 px-1.5 py-0.5 text-xs font-medium text-[#8a6a00] dark:text-[#ffd600]">
                projeção {formatarMoeda(projecao)}
              </span>
            )}
          </div>
        </div>

        {temMeta ? (
          <div className="mt-auto flex flex-col gap-2 pt-1">
            <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Meta de {mesLabel} · {formatarMoeda(meta)}
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {progresso.toFixed(1).replace(".", ",")}%
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[color:var(--chart-1)] transition-all"
                style={{ width: `${progresso}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 bg-foreground/40"
                style={{ left: `${Math.min(100, progressoEsperado)}%` }}
                title={`Hoje você deveria estar em ${progressoEsperado.toFixed(0)}% da meta.`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="tabular-nums">Faltam {formatarMoeda(valorRestante)}</span>
              <span className="tabular-nums">
                {metaJaAtingida
                  ? "Meta mensal atingida"
                  : diasOperacaoRestantes > 0
                    ? (
                        <>
                          Ritmo necessário: <b className="font-semibold text-foreground">{formatarMoeda(ritmoNecessario)}</b> por dia de operação
                        </>
                      )
                    : "Sem dias de operação restantes"}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-auto text-xs text-muted-foreground">
            Projeção de fechamento: {formatarMoeda(projecao)}
            {isAdmin && unidadeUnica ? " · configure uma meta para ver o progresso" : ""}
          </p>
        )}
      </CardContent>

      {isAdmin && unidadeUnica && (
        <EditarMetaCapacidadeDialog
          key={unidadeUnica.id}
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          unidade={unidadeUnica}
        />
      )}
    </Card>
  );
}

function EditarMetaCapacidadeDialog({
  open,
  onOpenChange,
  unidade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidade: Unidade;
}) {
  const router = useRouter();
  const [meta, setMeta] = React.useState(unidade.meta_mensal ? String(unidade.meta_mensal) : "");
  const [capacidade, setCapacidade] = React.useState(
    unidade.capacidade_dia ? String(unidade.capacidade_dia) : ""
  );
  const [capacidadeMoto, setCapacidadeMoto] = React.useState(
    unidade.capacidade_dia_moto ? String(unidade.capacidade_dia_moto) : ""
  );
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const metaValor = meta.trim() ? Number(meta.replace(",", ".")) : null;
    const capacidadeValor = capacidade.trim() ? Number(capacidade) : null;
    const capacidadeMotoValor = capacidadeMoto.trim() ? Number(capacidadeMoto) : null;

    if (metaValor !== null && (Number.isNaN(metaValor) || metaValor < 0)) {
      toast.error("Meta inválida.");
      return;
    }
    if (capacidadeValor !== null && (Number.isNaN(capacidadeValor) || capacidadeValor < 0)) {
      toast.error("Capacidade de automóveis inválida.");
      return;
    }
    if (capacidadeMotoValor !== null && (Number.isNaN(capacidadeMotoValor) || capacidadeMotoValor < 0)) {
      toast.error("Capacidade de motos inválida.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("unidades")
      .update({
        meta_mensal: metaValor,
        capacidade_dia: capacidadeValor,
        capacidade_dia_moto: capacidadeMotoValor,
      })
      .eq("id", unidade.id);
    setSalvando(false);

    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Configuração salva.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta e capacidade — {unidade.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meta-mensal">Meta de faturamento do mês (R$)</Label>
            <Input
              id="meta-mensal"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="capacidade-dia">Capacidade — automóveis por dia</Label>
            <Input
              id="capacidade-dia"
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="Ex.: 25"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="capacidade-dia-moto">Capacidade — motos por dia</Label>
            <Input
              id="capacidade-dia-moto"
              value={capacidadeMoto}
              onChange={(e) => setCapacidadeMoto(e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="Ex.: 8"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="gradient" disabled={salvando} onClick={salvar}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
