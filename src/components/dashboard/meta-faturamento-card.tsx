"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { calcularVariacao, formatarVariacao } from "@/lib/dashboard-variacao";
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

/** Faturamento do mês com meta e projeção (seção 4.1 do escopo de melhorias) — substitui o card simples de antes. */
export function MetaFaturamentoCard({
  resumo,
  isAdmin,
}: {
  resumo: DashboardResumo;
  isAdmin: boolean;
}) {
  const { unidades, unidadeSelecionadaId } = useUnidade();
  const [dialogAberto, setDialogAberto] = React.useState(false);

  const unidadesConsideradas = unidadeSelecionadaId
    ? unidades.filter((u) => u.id === unidadeSelecionadaId)
    : unidades;
  const meta = unidadesConsideradas.reduce((acc, u) => acc + (u.meta_mensal ?? 0), 0);
  const temMeta = meta > 0;

  const hoje = new Date();
  const diasDecorridos = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const projecao = (resumo.mes.faturamento / diasDecorridos) * diasNoMes;
  const progresso = temMeta ? Math.min(100, (resumo.mes.faturamento / meta) * 100) : 0;

  const infoVariacao = formatarVariacao(
    calcularVariacao(resumo.mes.faturamento, resumo.mes_anterior.faturamento),
    formatarMoeda
  );

  const unidadeUnica = unidadeSelecionadaId
    ? (unidades.find((u) => u.id === unidadeSelecionadaId) ?? null)
    : null;

  return (
    <Card className="h-full border-transparent bg-[image:var(--gradient-cta)] text-[#101314] shadow-sm">
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/10 text-[#101314]">
              <TrendingUp className="size-4.5" />
            </div>
            <p className="text-sm font-medium text-[#101314]/70">Faturamento do mês</p>
          </div>
          {isAdmin && unidadeUnica && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Configurar meta e capacidade"
              className="text-[#101314] hover:bg-black/10 hover:text-[#101314]"
              onClick={() => setDialogAberto(true)}
            >
              <Settings2 className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-heading text-2xl font-bold tabular-nums">
            {formatarMoeda(resumo.mes.faturamento)}
          </span>
          {infoVariacao && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full bg-black/10 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                  infoVariacao.tom === "positivo" && "text-green-900",
                  infoVariacao.tom === "negativo" && "text-red-900",
                  infoVariacao.tom === "neutro" && "text-[#101314]/70"
                )}
              >
                {infoVariacao.texto}
              </span>
              <span className="text-xs text-[#101314]/70">vs mês anterior</span>
            </div>
          )}
        </div>

        {temMeta ? (
          <div className="mt-auto flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-[#101314] transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-[#101314]/70">
              {progresso.toFixed(0)}% da meta ({formatarMoeda(meta)}) · projeção {formatarMoeda(projecao)}
            </p>
          </div>
        ) : (
          <p className="mt-auto text-xs text-[#101314]/70">
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
  const [salvando, setSalvando] = React.useState(false);

  async function salvar() {
    const metaValor = meta.trim() ? Number(meta.replace(",", ".")) : null;
    const capacidadeValor = capacidade.trim() ? Number(capacidade) : null;

    if (metaValor !== null && (Number.isNaN(metaValor) || metaValor < 0)) {
      toast.error("Meta inválida.");
      return;
    }
    if (capacidadeValor !== null && (Number.isNaN(capacidadeValor) || capacidadeValor < 0)) {
      toast.error("Capacidade inválida.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("unidades")
      .update({ meta_mensal: metaValor, capacidade_dia: capacidadeValor })
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
            <Label htmlFor="capacidade-dia">Capacidade — veículos por dia</Label>
            <Input
              id="capacidade-dia"
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="Ex.: 25"
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
