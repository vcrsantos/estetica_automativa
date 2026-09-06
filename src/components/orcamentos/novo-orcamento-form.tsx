"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, UserRoundX, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { encontrarPreco } from "@/lib/ordens/preco";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente, Preco, PorteVeiculo, Servico, Unidade, Veiculo } from "@/types/database";
import { ClienteBuscaRapida } from "@/components/clientes/cliente-busca-rapida";
import { VeiculoSelect } from "@/components/ordens/veiculo-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ItemOrcamento = {
  chaveLocal: string;
  servico_id: string | null;
  descricao: string;
  valor: number;
};

function dataPadraoValidade() {
  const data = new Date();
  data.setDate(data.getDate() + 7);
  return data.toISOString().slice(0, 10);
}

export function NovoOrcamentoForm({
  unidades,
  servicos,
  precos,
}: {
  unidades: Unidade[];
  servicos: Servico[];
  precos: Preco[];
}) {
  const router = useRouter();
  const [unidadeId, setUnidadeId] = React.useState(unidades[0]?.id ?? "");
  const [modoContatoAvulso, setModoContatoAvulso] = React.useState(false);
  const [cliente, setCliente] = React.useState<Cliente | null>(null);
  const [contatoNome, setContatoNome] = React.useState("");
  const [contatoTelefone, setContatoTelefone] = React.useState("");
  const [veiculo, setVeiculo] = React.useState<Veiculo | null>(null);
  const [porteAvulso, setPorteAvulso] = React.useState<PorteVeiculo | "">("");
  const [enderecoAtendimento, setEnderecoAtendimento] = React.useState("");
  const [itens, setItens] = React.useState<ItemOrcamento[]>([]);
  const [itemPersonalizado, setItemPersonalizado] = React.useState(false);
  const [descricaoPersonalizada, setDescricaoPersonalizada] = React.useState("");
  const [valorPersonalizado, setValorPersonalizado] = React.useState("");
  const [desconto, setDesconto] = React.useState("");
  const [validadeEm, setValidadeEm] = React.useState(dataPadraoValidade());
  const [condicoes, setCondicoes] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const porteAtual = veiculo?.porte || (porteAvulso || null);

  function adicionarItem(servico: Servico) {
    if (itens.some((i) => i.servico_id === servico.id)) {
      toast.info("Esse serviço já está na lista.");
      return;
    }
    const valor = encontrarPreco(precos, servico.id, unidadeId, porteAtual);
    setItens((atual) => [
      ...atual,
      { chaveLocal: crypto.randomUUID(), servico_id: servico.id, descricao: servico.nome, valor },
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
      { chaveLocal: crypto.randomUUID(), servico_id: null, descricao: descricaoPersonalizada.trim(), valor },
    ]);
    setDescricaoPersonalizada("");
    setValorPersonalizado("");
    setItemPersonalizado(false);
  }

  function atualizarValorItem(chaveLocal: string, valorTexto: string) {
    const valor = Number(valorTexto.replace(",", "."));
    setItens((atual) =>
      atual.map((i) => (i.chaveLocal === chaveLocal ? { ...i, valor: Number.isNaN(valor) ? 0 : valor } : i))
    );
  }

  function removerItem(chaveLocal: string) {
    setItens((atual) => atual.filter((i) => i.chaveLocal !== chaveLocal));
  }

  const subtotal = itens.reduce((acc, i) => acc + i.valor, 0);
  const descontoValor = Number(desconto.replace(",", ".")) || 0;
  const total = Math.max(0, subtotal - descontoValor);

  async function salvar() {
    if (!unidadeId) {
      toast.error("Selecione a unidade.");
      return;
    }
    if (!cliente && (!contatoNome.trim() || !contatoTelefone.trim())) {
      toast.error("Selecione um cliente ou informe nome e telefone.");
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

    const { data: orcamento, error: erroOrcamento } = await supabase
      .from("orcamentos")
      .insert({
        unidade_id: unidadeId,
        cliente_id: cliente?.id ?? null,
        veiculo_id: veiculo?.id ?? null,
        contato_nome: cliente ? null : contatoNome.trim(),
        contato_telefone: cliente ? null : contatoTelefone.trim(),
        porte: veiculo ? null : porteAvulso || null,
        endereco_atendimento: enderecoAtendimento || null,
        status: "rascunho",
        validade_em: validadeEm || null,
        desconto: descontoValor,
        valor_total: total,
        condicoes: condicoes || null,
        observacoes: observacoes || null,
        criado_por: user?.id ?? null,
      })
      .select("*")
      .single();

    if (erroOrcamento || !orcamento) {
      setSalvando(false);
      toast.error("Não foi possível criar o orçamento.");
      return;
    }

    const { error: erroItens } = await supabase.from("orcamento_itens").insert(
      itens.map((i) => ({
        orcamento_id: orcamento.id,
        servico_id: i.servico_id,
        descricao: i.descricao,
        valor: i.valor,
      }))
    );

    setSalvando(false);

    if (erroItens) {
      toast.error("Orçamento criado, mas houve um problema ao salvar os itens.");
    } else {
      toast.success(`Orçamento #${orcamento.numero} criado.`);
    }
    router.push(`/orcamentos/${orcamento.id}`);
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {unidades.length > 1 && (
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
        {modoContatoAvulso ? (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={contatoNome}
                onChange={(e) => setContatoNome(e.target.value)}
                placeholder="Nome"
              />
              <Input
                value={contatoTelefone}
                onChange={(e) => setContatoTelefone(e.target.value)}
                placeholder="Telefone (WhatsApp)"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setModoContatoAvulso(false)}
            >
              Buscar cliente cadastrado
            </Button>
          </div>
        ) : cliente ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{cliente.nome}</p>
              <p className="text-sm text-muted-foreground">{cliente.telefone || "Sem telefone"}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCliente(null)}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <ClienteBuscaRapida onSelecionar={setCliente} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setModoContatoAvulso(true)}
            >
              <UserRoundX className="size-4" />
              Orçar sem cadastro (só nome e telefone)
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Veículo</Label>
        {cliente ? (
          <VeiculoSelect
            clienteId={cliente.id}
            veiculoSelecionadoId={veiculo?.id ?? null}
            onChange={setVeiculo}
          />
        ) : (
          <Select
            items={PORTE_LABELS}
            value={porteAvulso}
            onValueChange={(v) => setPorteAvulso((v as PorteVeiculo) ?? "")}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Sem veículo / porte" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PORTE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          value={enderecoAtendimento}
          onChange={(e) => setEnderecoAtendimento(e.target.value)}
          placeholder="Endereço de atendimento (para higienização residencial, opcional)"
        />
      </div>

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
                      value={item.valor}
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
          <Label htmlFor="validade">Validade</Label>
          <Input
            id="validade"
            type="date"
            value={validadeEm}
            onChange={(e) => setValidadeEm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="condicoes">Condições de pagamento</Label>
          <Input
            id="condicoes"
            value={condicoes}
            onChange={(e) => setCondicoes(e.target.value)}
            placeholder="Ex.: à vista ou em até 2x no cartão"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:sticky sm:rounded-md sm:border">
        <div className="text-sm">
          <p className="text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <Button size="lg" disabled={salvando} onClick={salvar}>
          {salvando && <Loader2 className="size-4 animate-spin" />}
          Criar orçamento
        </Button>
      </div>
    </div>
  );
}
