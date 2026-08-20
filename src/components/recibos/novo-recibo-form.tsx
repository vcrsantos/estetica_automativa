"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { valorPorExtenso } from "@/lib/valor-por-extenso";
import { FORMA_PAGAMENTO_LABELS, STATUS_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import { ClienteBuscaRapida } from "@/components/clientes/cliente-busca-rapida";
import type {
  Cliente,
  ConfiguracaoEmitente,
  EmitirReciboPayload,
  FormaPagamento,
  OrdemServico,
  ReciboTipo,
  Unidade,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIPO_LABELS: Record<ReciboTipo, string> = {
  quitacao: "Quitação (recebido integral)",
  sinal: "Sinal",
  parcial: "Pagamento parcial",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

type ItemAvulso = { descricao: string; quantidade: string; valorUnitario: string };

export function NovoReciboForm({
  unidades,
  unidadeFixaId,
}: {
  unidades: Unidade[];
  unidadeFixaId: string | null;
}) {
  const router = useRouter();
  const [unidadeId, setUnidadeId] = React.useState(unidadeFixaId ?? unidades[0]?.id ?? "");
  const [config, setConfig] = React.useState<ConfiguracaoEmitente | null>(null);
  const [carregandoConfig, setCarregandoConfig] = React.useState(true);

  const [origem, setOrigem] = React.useState<"os" | "avulso">("os");
  const [tipo, setTipo] = React.useState<ReciboTipo>("quitacao");

  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [osDisponiveis, setOsDisponiveis] = React.useState<OrdemServico[]>([]);
  const [carregandoOs, setCarregandoOs] = React.useState(false);
  const [osSelecionadaId, setOsSelecionadaId] = React.useState<string | null>(null);

  const [itensAvulso, setItensAvulso] = React.useState<ItemAvulso[]>([
    { descricao: "", quantidade: "1", valorUnitario: "" },
  ]);

  const [tomadorNome, setTomadorNome] = React.useState("");
  const [tomadorDocumento, setTomadorDocumento] = React.useState("");
  const [tomadorEndereco, setTomadorEndereco] = React.useState("");
  const [referenteA, setReferenteA] = React.useState("");
  const [valorInformado, setValorInformado] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<FormaPagamento>("pix");
  const [dataPagamento, setDataPagamento] = React.useState(hojeIso);
  const [assinanteNome, setAssinanteNome] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregandoConfig(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("configuracao_emitente")
        .select("*")
        .eq("unidade_id", unidadeId)
        .maybeSingle();
      if (cancelado) return;
      setConfig(data);
      setAssinanteNome(data?.assinante_nome_padrao ?? "");
      setCarregandoConfig(false);
    }

    if (unidadeId) carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeId]);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      if (!cliente || origem !== "os") {
        setOsDisponiveis([]);
        return;
      }
      setCarregandoOs(true);
      const supabase = createClient();
      const { data: os } = await supabase
        .from("ordens_servico")
        .select("*")
        .eq("cliente_id", cliente.id)
        .eq("unidade_id", unidadeId)
        .neq("status", "cancelado")
        .order("entrada_em", { ascending: false });

      if (cancelado || !os) return;

      const osIds = os.map((o) => o.id);
      const { data: vinculos } = osIds.length
        ? await supabase.from("recibo_os").select("os_id").in("os_id", osIds).eq("ativo", true)
        : { data: [] as { os_id: string }[] };

      if (cancelado) return;
      const osComRecibo = new Set((vinculos ?? []).map((v) => v.os_id));
      setOsDisponiveis(os.filter((o) => !osComRecibo.has(o.id)));
      setCarregandoOs(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [cliente, origem, unidadeId]);

  const osSelecionada = osDisponiveis.find((o) => o.id === osSelecionadaId) ?? null;

  function selecionarCliente(c: Cliente) {
    setCliente(c);
    setTomadorNome(c.nome);
    setOsSelecionadaId(null);
  }

  function selecionarOs(os: OrdemServico) {
    setOsSelecionadaId(os.id);
    setValorInformado(String(os.valor_total));
    setReferenteA(`Serviços realizados na OS #${os.numero}`);
  }

  function atualizarItemAvulso(index: number, campo: keyof ItemAvulso, valor: string) {
    setItensAvulso((atual) => atual.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function adicionarItemAvulso() {
    setItensAvulso((atual) => [...atual, { descricao: "", quantidade: "1", valorUnitario: "" }]);
  }

  function removerItemAvulso(index: number) {
    setItensAvulso((atual) => atual.filter((_, i) => i !== index));
  }

  const totalAvulso = itensAvulso.reduce((acc, item) => {
    const qtd = Number(item.quantidade.replace(",", ".")) || 0;
    const valorUnit = Number(item.valorUnitario.replace(",", ".")) || 0;
    return acc + qtd * valorUnit;
  }, 0);

  const valor = origem === "avulso" ? totalAvulso : Number(valorInformado.replace(",", ".")) || 0;

  async function emitir() {
    if (!unidadeId) {
      toast.error("Selecione a unidade.");
      return;
    }
    if (!config) {
      toast.error("Configure os dados do emitente desta unidade antes de emitir recibos.");
      return;
    }
    if (!tomadorNome.trim()) {
      toast.error("Informe o nome de quem recebe o recibo.");
      return;
    }
    if (origem === "os" && !osSelecionada) {
      toast.error("Selecione a OS referente ao recibo.");
      return;
    }
    if (origem === "avulso" && itensAvulso.every((i) => !i.descricao.trim())) {
      toast.error("Adicione ao menos um item.");
      return;
    }
    if (valor <= 0) {
      toast.error("O valor do recibo precisa ser maior que zero.");
      return;
    }
    if (!referenteA.trim()) {
      toast.error("Informe a que o recibo se refere.");
      return;
    }
    if (!assinanteNome.trim()) {
      toast.error("Informe o nome do assinante.");
      return;
    }

    const itens =
      origem === "avulso"
        ? itensAvulso
            .filter((i) => i.descricao.trim())
            .map((i) => {
              const quantidade = Number(i.quantidade.replace(",", ".")) || 1;
              const valorUnitario = Number(i.valorUnitario.replace(",", ".")) || 0;
              return {
                descricao: i.descricao.trim(),
                quantidade,
                valor_unitario: valorUnitario,
                valor_total: quantidade * valorUnitario,
              };
            })
        : [
            {
              descricao: referenteA.trim(),
              quantidade: 1,
              valor_unitario: valor,
              valor_total: valor,
            },
          ];

    const payload: EmitirReciboPayload = {
      unidade_id: unidadeId,
      serie: config.serie,
      tipo,
      origem,
      cliente_id: cliente?.id ?? null,
      tomador_nome_exibicao: tomadorNome.trim(),
      tomador_documento: tomadorDocumento.trim() || null,
      tomador_endereco: tomadorEndereco.trim() || null,
      referente_a: referenteA.trim(),
      forma_pagamento: formaPagamento,
      data_pagamento: dataPagamento,
      local_emissao: config.endereco_cidade,
      assinante_nome: assinanteNome.trim(),
      observacoes: observacoes.trim() || null,
      valor,
      valor_extenso: valorPorExtenso(valor),
      itens,
      os_vinculos:
        origem === "os" && osSelecionada
          ? [{ os_id: osSelecionada.id, valor_considerado: valor }]
          : [],
    };

    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("emitir_recibo", { payload });
    setEnviando(false);

    if (error || !data) {
      toast.error(error?.message ?? "Não foi possível emitir o recibo.");
      return;
    }

    toast.success(`Recibo #${data.numero} emitido.`);
    router.push(`/recibos/${data.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {unidadeFixaId === null && unidades.length > 1 && (
        <div className="flex max-w-xs flex-col gap-2">
          <Label>Unidade</Label>
          <Select
            items={Object.fromEntries(unidades.map((u) => [u.id, u.nome]))}
            value={unidadeId}
            onValueChange={(v) => v && setUnidadeId(v as string)}
          >
            <SelectTrigger>
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

      {!carregandoConfig && !config && (
        <Card className="max-w-lg border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Esta unidade ainda não tem os dados do emitente configurados. Peça a um administrador
            para configurar em Ações › Recibos › Configurar emitente antes de emitir.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ClienteBuscaRapida onSelecionar={selecionarCliente} />
          {cliente && (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span className="font-medium">{cliente.nome}</span>
              <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>
                Trocar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={origem} onValueChange={(v) => setOrigem(v as "os" | "avulso")}>
        <TabsList>
          <TabsTrigger value="os">A partir de OS</TabsTrigger>
          <TabsTrigger value="avulso">Avulso</TabsTrigger>
        </TabsList>

        <TabsContent value="os">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ordem de serviço</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!cliente && (
                <p className="text-sm text-muted-foreground">Busque um cliente para ver as OS dele.</p>
              )}
              {cliente && carregandoOs && (
                <p className="text-sm text-muted-foreground">Carregando OS...</p>
              )}
              {cliente && !carregandoOs && osDisponiveis.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma OS desta unidade disponível para recibo (ou já tem recibo ativo).
                </p>
              )}
              {osDisponiveis.map((os) => (
                <button
                  type="button"
                  key={os.id}
                  onClick={() => selecionarOs(os)}
                  className={`flex items-center justify-between rounded-md border p-2 text-left text-sm transition-colors hover:bg-accent ${
                    osSelecionadaId === os.id ? "border-primary bg-accent" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">OS #{os.numero}</p>
                    <p className="text-muted-foreground">
                      {new Date(os.entrada_em).toLocaleDateString("pt-BR")} ·{" "}
                      {STATUS_PAGAMENTO_LABELS[os.status_pagamento]}
                    </p>
                  </div>
                  <span className="font-semibold">{formatarMoeda(os.valor_total)}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avulso">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {itensAvulso.map((item, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={item.descricao}
                      onChange={(e) => atualizarItemAvulso(i, "descricao", e.target.value)}
                    />
                  </div>
                  <div className="flex w-20 flex-col gap-1">
                    <Label className="text-xs">Qtd.</Label>
                    <Input
                      value={item.quantidade}
                      onChange={(e) => atualizarItemAvulso(i, "quantidade", e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex w-28 flex-col gap-1">
                    <Label className="text-xs">Valor unit.</Label>
                    <Input
                      value={item.valorUnitario}
                      onChange={(e) => atualizarItemAvulso(i, "valorUnitario", e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={itensAvulso.length === 1}
                    onClick={() => removerItemAvulso(i)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={adicionarItemAvulso}>
                <Plus className="size-4" />
                Adicionar item
              </Button>
              <p className="text-sm font-medium">Total: {formatarMoeda(totalAvulso)}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Dados do recibo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Nome de exibição do tomador</Label>
            <Input value={tomadorNome} onChange={(e) => setTomadorNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>CPF/CNPJ do tomador (opcional)</Label>
            <Input value={tomadorDocumento} onChange={(e) => setTomadorDocumento(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Endereço do tomador (opcional)</Label>
            <Input value={tomadorEndereco} onChange={(e) => setTomadorEndereco(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo de recibo</Label>
            <Select items={TIPO_LABELS} value={tipo} onValueChange={(v) => v && setTipo(v as ReciboTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Valor recebido (R$)</Label>
            <Input
              value={origem === "avulso" ? formatarMoeda(totalAvulso) : valorInformado}
              onChange={(e) => setValorInformado(e.target.value)}
              disabled={origem === "avulso"}
              inputMode="decimal"
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Referente a</Label>
            <Input value={referenteA} onChange={(e) => setReferenteA(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <Select
              items={FORMA_PAGAMENTO_LABELS}
              value={formaPagamento}
              onValueChange={(v) => v && setFormaPagamento(v as FormaPagamento)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMA_PAGAMENTO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Data do pagamento</Label>
            <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Nome do assinante</Label>
            <Input value={assinanteNome} onChange={(e) => setAssinanteNome(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {valor > 0 && (
        <p className="text-sm text-muted-foreground">
          Por extenso: <span className="italic">{valorPorExtenso(valor)}</span>
        </p>
      )}

      <Button className="w-fit" disabled={enviando} onClick={emitir}>
        {enviando && <Loader2 className="size-4 animate-spin" />}
        Emitir recibo
      </Button>
    </div>
  );
}
