"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { encontrarPreco } from "@/lib/ordens/preco";
import {
  FORMA_PAGAMENTO_LABELS,
  STATUS_PAGAMENTO_LABELS,
} from "@/lib/validations/ordem-servico";
import type { Cliente, FormaPagamento, Preco, Servico, StatusPagamento, Unidade, Veiculo } from "@/types/database";
import { ClienteBuscaRapida } from "@/components/clientes/cliente-busca-rapida";
import { VeiculoSelect } from "@/components/ordens/veiculo-select";
import { ExecutorSelect } from "@/components/ordens/executor-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ItemOs = {
  chaveLocal: string;
  servico_id: string | null;
  descricao: string;
  valor_tabela: number;
  valor_praticado: number;
};

/** Data local (YYYY-MM-DD) sem o deslocamento de fuso que toISOString() traria. */
function hojeIso() {
  const agora = new Date();
  const semFuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return semFuso.toISOString().slice(0, 10);
}

export function NovaOsForm({
  unidades,
  unidadeFixaId,
  servicos,
  precos,
}: {
  unidades: Unidade[];
  unidadeFixaId: string | null;
  servicos: Servico[];
  precos: Preco[];
}) {
  const router = useRouter();
  const [unidadeId, setUnidadeId] = React.useState(unidadeFixaId ?? unidades[0]?.id ?? "");
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [itens, setItens] = React.useState<ItemOs[]>([]);
  const [executorIds, setExecutorIds] = React.useState<string[]>([]);
  const [mostrarDetalhes, setMostrarDetalhes] = React.useState(false);
  const [dataServico, setDataServico] = React.useState(hojeIso());
  const [jaConcluido, setJaConcluido] = React.useState(false);
  const [formaPagamento, setFormaPagamento] = React.useState<FormaPagamento | "nenhuma">("nenhuma");
  const [statusPagamento, setStatusPagamento] = React.useState<StatusPagamento>("pago");
  const [desconto, setDesconto] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = React.useState("");
  const [itemPersonalizado, setItemPersonalizado] = React.useState(false);
  const [descricaoPersonalizada, setDescricaoPersonalizada] = React.useState("");
  const [valorPersonalizado, setValorPersonalizado] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  function adicionarItem(servico: Servico) {
    if (itens.some((i) => i.servico_id === servico.id)) {
      toast.info("Esse serviço já está na lista.");
      return;
    }
    const valor = encontrarPreco(precos, servico.id, unidadeId, veiculo?.porte ?? null);
    setItens((atual) => [
      ...atual,
      {
        chaveLocal: crypto.randomUUID(),
        servico_id: servico.id,
        descricao: servico.nome,
        valor_tabela: valor,
        valor_praticado: valor,
      },
    ]);
  }

  function adicionarItemPersonalizado() {
    const valor = Number(valorPersonalizado.replace(",", "."));
    if (!descricaoPersonalizada.trim() || Number.isNaN(valor)) {
      toast.error("Informe descrição e valor válidos.");
      return;
    }
    setItens((atual) => [
      ...atual,
      {
        chaveLocal: crypto.randomUUID(),
        servico_id: null,
        descricao: descricaoPersonalizada.trim(),
        valor_tabela: valor,
        valor_praticado: valor,
      },
    ]);
    setDescricaoPersonalizada("");
    setValorPersonalizado("");
    setItemPersonalizado(false);
  }

  function atualizarValorItem(chaveLocal: string, valorTexto: string) {
    const valor = Number(valorTexto.replace(",", "."));
    setItens((atual) =>
      atual.map((i) =>
        i.chaveLocal === chaveLocal
          ? { ...i, valor_praticado: Number.isNaN(valor) ? 0 : valor }
          : i
      )
    );
  }

  function removerItem(chaveLocal: string) {
    setItens((atual) => atual.filter((i) => i.chaveLocal !== chaveLocal));
  }

  const subtotal = itens.reduce((acc, i) => acc + i.valor_praticado, 0);
  const descontoValor = Number(desconto.replace(",", ".")) || 0;
  const total = Math.max(0, subtotal - descontoValor);

  function alterarDataServico(novaData: string) {
    setDataServico(novaData);
    if (novaData !== hojeIso()) {
      setJaConcluido(true);
    }
  }

  async function salvar() {
    if (!cliente) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (!unidadeId) {
      toast.error("Selecione a unidade.");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um serviço.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Serviço lançado no próprio dia mantém o horário real (now()); um
    // lançamento retroativo grava meio-dia local da data escolhida, já que
    // só a data importa para o controle de volume/financeiro.
    const entradaEm =
      dataServico === hojeIso() ? new Date().toISOString() : new Date(`${dataServico}T12:00:00`).toISOString();

    const { data: os, error: erroOs } = await supabase
      .from("ordens_servico")
      .insert({
        unidade_id: unidadeId,
        cliente_id: cliente.id,
        veiculo_id: veiculo?.id ?? null,
        status: jaConcluido ? "entregue" : "agendado",
        entrada_em: entradaEm,
        saida_em: jaConcluido ? entradaEm : null,
        previsao_entrega: previsaoEntrega ? new Date(previsaoEntrega).toISOString() : null,
        desconto: descontoValor,
        valor_total: total,
        forma_pagamento: jaConcluido && formaPagamento !== "nenhuma" ? formaPagamento : null,
        status_pagamento: jaConcluido ? statusPagamento : "pendente",
        observacoes: observacoes || null,
        criado_por: user?.id ?? null,
      })
      .select("*")
      .single();

    if (erroOs || !os) {
      setSalvando(false);
      toast.error("Não foi possível abrir a OS.");
      return;
    }

    const { error: erroItens } = await supabase.from("os_itens").insert(
      itens.map((i) => ({
        os_id: os.id,
        servico_id: i.servico_id,
        descricao: i.descricao,
        valor_tabela: i.valor_tabela,
        valor_praticado: i.valor_praticado,
        alterado_por: i.valor_praticado !== i.valor_tabela ? (user?.id ?? null) : null,
      }))
    );

    if (executorIds.length > 0) {
      await supabase
        .from("os_executores")
        .insert(executorIds.map((executorId) => ({ os_id: os.id, executor_id: executorId })));
    }

    setSalvando(false);

    if (erroItens) {
      toast.error("OS aberta, mas houve um problema ao salvar os itens.");
    } else {
      toast.success(`OS #${os.numero} aberta.`);
    }
    router.push(`/ordens/${os.id}`);
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {unidades.length > 1 && !unidadeFixaId && (
        <div className="flex flex-col gap-2">
          <Label>Unidade</Label>
          <Select
            items={Object.fromEntries(unidades.map((u) => [u.id, u.nome]))}
            value={unidadeId}
            onValueChange={(v) => setUnidadeId(v ?? "")}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Cliente</Label>
        {cliente ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{cliente.nome}</p>
              <p className="text-sm text-muted-foreground">{cliente.telefone || "Sem telefone"}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCliente(null);
                setVeiculo(null);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <ClienteBuscaRapida
            onSelecionar={(c) => {
              setCliente(c);
              setVeiculo(null);
            }}
          />
        )}
      </div>

      {cliente && (
        <div className="flex flex-col gap-2">
          <Label>Veículo</Label>
          <VeiculoSelect
            clienteId={cliente.id}
            veiculoSelecionadoId={veiculo?.id ?? null}
            onChange={setVeiculo}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Serviços</Label>
        <div className="flex flex-wrap gap-2">
          {servicos.map((servico) => (
            <button
              key={servico.id}
              type="button"
              onClick={() => adicionarItem(servico)}
              className="rounded-full border px-3 py-1.5 text-sm hover:bg-accent"
            >
              {servico.nome}
            </button>
          ))}
          {!itemPersonalizado && (
            <button
              type="button"
              onClick={() => setItemPersonalizado(true)}
              className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <Plus className="size-3.5" />
              Item avulso
            </button>
          )}
        </div>

        {itemPersonalizado && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <Input
              value={descricaoPersonalizada}
              onChange={(e) => setDescricaoPersonalizada(e.target.value)}
              placeholder="Descrição do serviço"
              className="h-8 max-w-56"
            />
            <Input
              value={valorPersonalizado}
              onChange={(e) => setValorPersonalizado(e.target.value)}
              placeholder="Valor"
              inputMode="decimal"
              className="h-8 w-24"
            />
            <Button type="button" size="sm" onClick={adicionarItemPersonalizado}>
              Adicionar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setItemPersonalizado(false)}>
              Cancelar
            </Button>
          </div>
        )}

        {itens.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-2 py-3">
              {itens.map((item) => (
                <div key={item.chaveLocal} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{item.descricao}</span>
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      value={item.valor_praticado}
                      onChange={(e) => atualizarValorItem(item.chaveLocal, e.target.value)}
                      inputMode="decimal"
                      className="h-8 pl-8"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover item"
                    onClick={() => removerItem(item.chaveLocal)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Executor(es)</Label>
        {unidadeId ? (
          <ExecutorSelect unidadeId={unidadeId} selecionados={executorIds} onChange={setExecutorIds} />
        ) : (
          <p className="text-sm text-muted-foreground">Selecione a unidade primeiro.</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-servico">Data do serviço</Label>
            <Input
              id="data-servico"
              type="date"
              value={dataServico}
              onChange={(e) => alterarDataServico(e.target.value)}
              className="w-40"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch checked={jaConcluido} onCheckedChange={setJaConcluido} />
            Serviço já foi concluído e pago
          </label>
        </div>
        {dataServico !== hojeIso() && (
          <p className="text-xs text-muted-foreground">
            Lançamento retroativo — a OS já entra marcada como entregue, para não precisar passar
            de novo pelo fluxo de agendado/em execução.
          </p>
        )}

        {jaConcluido && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              items={{ nenhuma: "A definir", ...FORMA_PAGAMENTO_LABELS }}
              value={formaPagamento}
              onValueChange={(v) => setFormaPagamento((v as FormaPagamento) ?? "nenhuma")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">A definir</SelectItem>
                {Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={STATUS_PAGAMENTO_LABELS}
              value={statusPagamento}
              onValueChange={(v) => setStatusPagamento((v as StatusPagamento) ?? "pago")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_PAGAMENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMostrarDetalhes((v) => !v)}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        {mostrarDetalhes ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        Detalhes adicionais (desconto, previsão, observações)
      </button>

      {mostrarDetalhes && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="desconto">Desconto (R$)</Label>
            <Input
              id="desconto"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="previsao">Previsão de entrega</Label>
            <Input
              id="previsao"
              type="datetime-local"
              value={previsaoEntrega}
              onChange={(e) => setPrevisaoEntrega(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="observacoes">Observações internas</Label>
            <Textarea
              id="observacoes"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:sticky sm:rounded-md sm:border">
        <div className="text-sm">
          <p className="text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" disabled={salvando} onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button variant="gradient" size="lg" disabled={salvando} onClick={salvar}>
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Abrir OS
          </Button>
        </div>
      </div>
    </div>
  );
}
