"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";
import { Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { valorPorExtenso } from "@/lib/valor-por-extenso";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import { FORMA_PAGAMENTO_LABELS, STATUS_OS_LABELS } from "@/lib/validations/ordem-servico";
import { ReciboPdf } from "@/components/recibos/recibo-pdf";
import type {
  Cliente,
  EmitirReciboPayload,
  FormaPagamento,
  OrdemServico,
  Recibo,
  Veiculo,
} from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataPagamento(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? partes[0]?.[1] ?? "")).toUpperCase();
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

/**
 * Comprovante rápido de recebimento (linha de "Histórico de serviços") —
 * gera um recibo de verdade (tipo quitação, mesma emitir_recibo do módulo
 * de Recibos) e mostra o texto pronto pra WhatsApp e o PDF, sem sair da
 * tela. Se a OS já tiver um recibo ativo, mostra o existente em vez de
 * tentar emitir de novo (o banco recusaria — cobrança duplicada).
 */
export function GerarReciboRapidoDialog({
  os,
  cliente,
  veiculo,
  onOpenChange,
}: {
  os: OrdemServico | null;
  cliente: Cliente | null;
  veiculo: Veiculo | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [carregando, setCarregando] = React.useState(false);
  const [recibo, setRecibo] = React.useState<Recibo | null>(null);
  const [servicoDescricao, setServicoDescricao] = React.useState("");
  const [gerandoPdf, setGerandoPdf] = React.useState(false);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar(osAtual: OrdemServico) {
      setCarregando(true);
      setRecibo(null);
      const supabase = createClient();

      const { data: vinculo } = await supabase
        .from("recibo_os")
        .select("recibo_id")
        .eq("os_id", osAtual.id)
        .eq("ativo", true)
        .maybeSingle();

      if (vinculo) {
        const { data: reciboExistente } = await supabase
          .from("recibo")
          .select("*")
          .eq("id", vinculo.recibo_id)
          .single();
        if (!cancelado) {
          setRecibo(reciboExistente);
          setServicoDescricao(reciboExistente?.referente_a ?? "");
          setCarregando(false);
        }
        return;
      }

      if (!osAtual.forma_pagamento) {
        if (!cancelado) {
          toast.error("Defina a forma de pagamento da OS antes de gerar o recibo.");
          setCarregando(false);
        }
        return;
      }
      if (osAtual.status_pagamento !== "pago") {
        if (!cancelado) {
          toast.error('Marque o pagamento da OS como "Pago" antes de gerar o recibo.');
          setCarregando(false);
        }
        return;
      }

      const [{ data: itensOs }, { data: config }] = await Promise.all([
        supabase.from("os_itens").select("*").eq("os_id", osAtual.id),
        supabase.from("configuracao_emitente").select("*").eq("unidade_id", osAtual.unidade_id).maybeSingle(),
      ]);

      if (cancelado) return;

      if (!config) {
        toast.error("Configure os dados do emitente desta unidade antes de gerar recibos.");
        setCarregando(false);
        return;
      }

      const referenteA = (itensOs ?? []).map((i) => i.descricao).join(" + ") || `OS #${osAtual.numero}`;
      const valor = osAtual.valor_total;

      const payload: EmitirReciboPayload = {
        unidade_id: osAtual.unidade_id,
        serie: config.serie,
        tipo: "quitacao",
        origem: "os",
        cliente_id: osAtual.cliente_id,
        tomador_nome_exibicao: cliente?.nome ?? "Cliente",
        tomador_documento: cliente?.documento ?? null,
        tomador_endereco: cliente?.endereco ?? null,
        referente_a: referenteA,
        forma_pagamento: osAtual.forma_pagamento,
        data_pagamento: hojeIso(),
        local_emissao: config.endereco_cidade,
        assinante_nome: config.assinante_nome_padrao,
        observacoes: osAtual.observacoes,
        valor,
        valor_extenso: valorPorExtenso(valor),
        itens: (itensOs ?? []).map((i) => ({
          descricao: i.descricao,
          quantidade: 1,
          valor_unitario: i.valor_praticado,
          valor_total: i.valor_praticado,
        })),
        os_vinculos: [{ os_id: osAtual.id, valor_considerado: valor }],
      };

      const { data: resultado, error } = await supabase.rpc("emitir_recibo", { payload });
      if (cancelado) return;

      if (error || !resultado) {
        toast.error(error?.message ?? "Não foi possível gerar o recibo.");
        setCarregando(false);
        return;
      }

      const { data: reciboNovo } = await supabase.from("recibo").select("*").eq("id", resultado.id).single();
      if (!cancelado) {
        setRecibo(reciboNovo);
        setServicoDescricao(referenteA);
        setCarregando(false);
      }
    }

    if (os) carregar(os);
    return () => {
      cancelado = true;
    };
  }, [os, cliente]);

  function montarTexto() {
    if (!recibo || !os) return "";
    const linhas = [
      "*RECIBO DE PAGAMENTO — POLIBRILHO*",
      "",
      `Recibo: ${recibo.serie}-${String(recibo.numero).padStart(6, "0")}`,
      `Cliente: ${recibo.tomador_snapshot.nome_exibicao}`,
      `Veículo: ${veiculo?.modelo || veiculo?.placa || "—"}`,
      veiculo ? `Tipo: ${PORTE_LABELS[veiculo.porte]}` : null,
      `Serviço: ${servicoDescricao}`,
      `Data do serviço: ${formatarDataHora(os.entrada_em)}`,
      `Status do atendimento: ${STATUS_OS_LABELS[os.status]}`,
      "",
      `*VALOR RECEBIDO: ${formatarMoeda(recibo.valor)}*`,
      `Forma de pagamento: ${FORMA_PAGAMENTO_LABELS[recibo.forma_pagamento as FormaPagamento] ?? recibo.forma_pagamento}`,
      `Pagamento confirmado em: ${formatarDataPagamento(recibo.data_pagamento)}`,
      recibo.observacoes ? `Observações: ${recibo.observacoes}` : null,
      "",
      "Este documento é um recibo de prestação de serviço e não constitui documento fiscal.",
    ];
    return linhas.filter((linha) => linha !== null).join("\n");
  }

  async function copiarTexto() {
    try {
      await navigator.clipboard.writeText(montarTexto());
      toast.success("Texto copiado.");
    } catch {
      toast.error("Não foi possível copiar o texto.");
    }
  }

  async function baixarPdf() {
    if (!recibo || !os) return;
    setGerandoPdf(true);
    try {
      const supabase = createClient();
      const { data: itens } = await supabase
        .from("recibo_item")
        .select("*")
        .eq("recibo_id", recibo.id)
        .order("ordem");
      const blob = await pdf(
        <ReciboPdf recibo={recibo} itens={itens ?? []} osVinculadas={[os]} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `recibo-${recibo.serie}-${String(recibo.numero).padStart(6, "0")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <Dialog open={os !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <p className="text-xs font-semibold tracking-wide text-green-600 uppercase dark:text-green-400">
            Comprovante de recebimento
          </p>
          <DialogTitle className="text-xl">Recibo do serviço</DialogTitle>
          <DialogDescription>Confira os dados antes de copiar o texto ou baixar o PDF.</DialogDescription>
        </DialogHeader>

        {carregando && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {!carregando && !recibo && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar o recibo desta OS.
          </p>
        )}

        {!carregando && recibo && os && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
              <Avatar size="lg">
                <AvatarFallback className="bg-[#FDF3E0] font-semibold text-[#7A5C00] dark:bg-[#7A5C00]/20 dark:text-[#FFD600]">
                  {iniciais(recibo.tomador_snapshot.nome_exibicao)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Recibo para
                </p>
                <p className="truncate font-semibold">{recibo.tomador_snapshot.nome_exibicao}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {servicoDescricao}
                  {veiculo ? ` · ${veiculo.modelo || veiculo.placa}` : ""} ·{" "}
                  {formatarDataPagamento(recibo.data_pagamento)}
                </p>
              </div>
              <Badge variant="success" className="shrink-0">
                Pago · {FORMA_PAGAMENTO_LABELS[recibo.forma_pagamento as FormaPagamento] ?? recibo.forma_pagamento}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoBox
                label="Número do recibo"
                value={`${recibo.serie}-${String(recibo.numero).padStart(6, "0")}`}
              />
              <InfoBox label="Valor recebido" value={formatarMoeda(recibo.valor)} />
              <InfoBox
                label="Forma de pagamento"
                value={FORMA_PAGAMENTO_LABELS[recibo.forma_pagamento as FormaPagamento] ?? recibo.forma_pagamento}
              />
              <InfoBox label="Pagamento confirmado" value={formatarDataPagamento(recibo.data_pagamento)} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Texto do recibo</p>
              <Textarea readOnly value={montarTexto()} rows={10} className={cn("font-mono text-xs")} />
              <p className="text-xs text-muted-foreground">
                O texto pode ser colado diretamente em uma conversa do WhatsApp.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline" disabled={!recibo} onClick={copiarTexto}>
            <Copy className="size-4" />
            Copiar texto
          </Button>
          <Button variant="gradient" disabled={!recibo || gerandoPdf} onClick={baixarPdf}>
            {gerandoPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
