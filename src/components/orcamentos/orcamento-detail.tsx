"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { CalendarCheck, Download, Loader2, MessageCircle, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { OrcamentoPdf } from "@/components/orcamentos/orcamento-pdf";
import { ClienteBuscaRapida } from "@/components/clientes/cliente-busca-rapida";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente, Orcamento, OrcamentoItem, StatusOrcamento, Unidade, Veiculo } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function agoraDatetimeLocal() {
  const agora = new Date();
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return semFuso.toISOString().slice(0, 16);
}

const STATUS_LABELS: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

const STATUS_BADGE_VARIANT: Record<StatusOrcamento, "info" | "outline" | "destructive" | "success" | "warning"> = {
  rascunho: "outline",
  enviado: "info",
  aprovado: "success",
  recusado: "destructive",
  expirado: "warning",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentoDetail({
  orcamento: orcamentoInicial,
  unidade,
  cliente: clienteInicial,
  veiculo,
  itens,
}: {
  orcamento: Orcamento;
  unidade: Unidade;
  cliente: Cliente | null;
  veiculo: Veiculo | null;
  itens: OrcamentoItem[];
}) {
  const router = useRouter();
  const [orcamento, setOrcamento] = React.useState(orcamentoInicial);
  const [cliente, setCliente] = React.useState(clienteInicial);
  const [gerandoPdf, setGerandoPdf] = React.useState<"baixar" | "whatsapp" | null>(null);
  const [convertendo, setConvertendo] = React.useState(false);
  const [vinculandoCliente, setVinculandoCliente] = React.useState(false);
  const [dataAgendamento, setDataAgendamento] = React.useState(agoraDatetimeLocal);

  const nomeContato = cliente?.nome ?? orcamento.contato_nome ?? "Cliente";
  const telefoneContato = cliente?.telefone ?? orcamento.contato_telefone ?? "";

  async function mudarStatus(novoStatus: StatusOrcamento) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orcamentos")
      .update({ status: novoStatus })
      .eq("id", orcamento.id)
      .select("*")
      .single();

    if (error || !data) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    setOrcamento(data);
    toast.success(`Status atualizado para "${STATUS_LABELS[novoStatus]}".`);
  }

  async function gerarPdfBlob() {
    return pdf(
      <OrcamentoPdf orcamento={orcamento} unidade={unidade} cliente={cliente} veiculo={veiculo} itens={itens} />
    ).toBlob();
  }

  async function baixarPdf() {
    setGerandoPdf("baixar");
    try {
      const blob = await gerarPdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orcamento-${orcamento.numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(null);
    }
  }

  async function enviarPorWhatsApp() {
    if (!telefoneContato) {
      toast.error("Este orçamento não tem telefone de contato.");
      return;
    }
    setGerandoPdf("whatsapp");
    try {
      const blob = await gerarPdfBlob();
      const supabase = createClient();
      const caminho = `${orcamento.id}.pdf`;
      const { error: erroUpload } = await supabase.storage
        .from("orcamentos")
        .upload(caminho, blob, { upsert: true, contentType: "application/pdf" });

      if (erroUpload) {
        toast.error("Não foi possível enviar o PDF.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("orcamentos").getPublicUrl(caminho);

      const mensagem = `Oi, ${nomeContato.split(" ")[0]}! Segue o orçamento #${orcamento.numero} da POLIBRILHO ${unidade.nome}: ${publicUrl}\n\nVálido até ${
        orcamento.validade_em
          ? new Date(orcamento.validade_em).toLocaleDateString("pt-BR", { timeZone: "UTC" })
          : "—"
      }.`;

      window.open(linkWhatsApp(telefoneContato, mensagem), "_blank", "noopener,noreferrer");

      if (orcamento.status === "rascunho") {
        await mudarStatus("enviado");
      }
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdf(null);
    }
  }

  async function criarOsAPartirDoOrcamento(
    clienteId: string,
    veiculoId: string | null,
    entradaEmLocal: string
  ) {
    setConvertendo(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: os, error: erroOs } = await supabase
      .from("ordens_servico")
      .insert({
        unidade_id: orcamento.unidade_id,
        cliente_id: clienteId,
        veiculo_id: veiculoId,
        status: "agendado",
        entrada_em: new Date(entradaEmLocal).toISOString(),
        desconto: orcamento.desconto,
        valor_total: orcamento.valor_total,
        observacoes: orcamento.observacoes,
        status_pagamento: "pendente",
        criado_por: user?.id ?? null,
      })
      .select("*")
      .single();

    if (erroOs || !os) {
      setConvertendo(false);
      toast.error("Não foi possível converter em OS.");
      return;
    }

    await supabase.from("os_itens").insert(
      itens.map((i) => ({
        os_id: os.id,
        servico_id: i.servico_id,
        descricao: i.descricao,
        valor_tabela: i.valor,
        valor_praticado: i.valor,
      }))
    );

    if (orcamento.status !== "aprovado") {
      await supabase.from("orcamentos").update({ status: "aprovado" }).eq("id", orcamento.id);
    }

    setConvertendo(false);
    toast.success(`OS #${os.numero} agendada a partir do orçamento.`);
    router.push(`/ordens/${os.id}`);
  }

  function confirmarAgendamento() {
    if (!orcamento.cliente_id) {
      setVinculandoCliente(true);
      return;
    }
    criarOsAPartirDoOrcamento(orcamento.cliente_id, orcamento.veiculo_id, dataAgendamento);
  }

  async function vincularClienteEConverter(clienteEscolhido: Cliente) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orcamentos")
      .update({ cliente_id: clienteEscolhido.id, contato_nome: null, contato_telefone: null })
      .eq("id", orcamento.id)
      .select("*")
      .single();

    if (error || !data) {
      toast.error("Não foi possível vincular o cliente.");
      return;
    }
    setOrcamento(data);
    setCliente(clienteEscolhido);
    setVinculandoCliente(false);
    criarOsAPartirDoOrcamento(clienteEscolhido.id, data.veiculo_id, dataAgendamento);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Orçamento #{orcamento.numero}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[orcamento.status]}>
              {STATUS_LABELS[orcamento.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {unidade.nome} · {formatarMoeda(orcamento.valor_total)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={gerandoPdf !== null} onClick={baixarPdf}>
            {gerandoPdf === "baixar" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Baixar PDF
          </Button>
          <Button disabled={gerandoPdf !== null} onClick={enviarPorWhatsApp}>
            {gerandoPdf === "whatsapp" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            Enviar por WhatsApp
          </Button>
        </div>
      </div>

      {(orcamento.status === "rascunho" || orcamento.status === "enviado") && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-base">O cliente aceitou o orçamento?</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => mudarStatus("aprovado")}>
              <ThumbsUp className="size-4" />
              Sim, aceitou
            </Button>
            <Button variant="outline" onClick={() => mudarStatus("recusado")}>
              <ThumbsDown className="size-4" />
              Não aceitou
            </Button>
          </CardContent>
        </Card>
      )}

      {orcamento.status === "aprovado" && (
        <Card className="max-w-md border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Orçamento aceito — agendar o serviço</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-agendamento">Data e hora do agendamento</Label>
              <Input
                id="data-agendamento"
                type="datetime-local"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                className="w-fit"
              />
            </div>
            <Button className="w-fit" disabled={convertendo} onClick={confirmarAgendamento}>
              {convertendo ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              Agendar serviço
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select
          items={STATUS_LABELS}
          value={orcamento.status}
          onValueChange={(v) => mudarStatus(v as StatusOrcamento)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {vinculandoCliente && (
        <Card className="max-w-md border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Vincule um cliente para agendar o serviço</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Este orçamento foi feito sem cadastro completo ({orcamento.contato_nome} ·{" "}
              {orcamento.contato_telefone}).
            </p>
            <ClienteBuscaRapida onSelecionar={vincularClienteEConverter} />
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setVinculandoCliente(false)}>
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cliente e veículo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {cliente ? (
              <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                {cliente.nome}
              </Link>
            ) : (
              <p className="flex items-center gap-1 font-medium text-muted-foreground">
                <UserPlus className="size-3.5" />
                {orcamento.contato_nome} (sem cadastro)
              </p>
            )}
            <p className="text-muted-foreground">{telefoneContato}</p>
            {veiculo ? (
              <p>
                {veiculo.placa || "Sem placa"} — {veiculo.marca} {veiculo.modelo} ·{" "}
                {PORTE_LABELS[veiculo.porte]}
              </p>
            ) : orcamento.porte ? (
              <p>Porte: {PORTE_LABELS[orcamento.porte]}</p>
            ) : (
              <p className="text-muted-foreground">Sem veículo</p>
            )}
            {orcamento.endereco_atendimento && <p>Endereço: {orcamento.endereco_atendimento}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {itens.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>{item.descricao}</span>
                <span className="font-medium">{formatarMoeda(item.valor)}</span>
              </div>
            ))}
            {orcamento.desconto > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Desconto</span>
                <span>- {formatarMoeda(orcamento.desconto)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatarMoeda(orcamento.valor_total)}</span>
            </div>
            <p className="pt-2 text-muted-foreground">
              Válido até{" "}
              {orcamento.validade_em
                ? new Date(orcamento.validade_em).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                : "—"}
            </p>
            {orcamento.condicoes && <p className="text-muted-foreground">{orcamento.condicoes}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
