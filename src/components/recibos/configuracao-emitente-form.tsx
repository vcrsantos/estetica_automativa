"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { ConfiguracaoEmitente, Unidade } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function campoVazio(unidadeId: string): ConfiguracaoEmitente {
  return {
    unidade_id: unidadeId,
    razao_social: "",
    nome_fantasia: "",
    documento: "",
    inscricao_municipal: "",
    endereco_logradouro: "",
    endereco_numero: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_uf: "",
    endereco_cep: "",
    telefone: "",
    email: "",
    logo_url: null,
    assinante_nome_padrao: "",
    serie: "A",
    atualizado_em: "",
  };
}

export function ConfiguracaoEmitenteForm({
  unidades,
  configuracoes,
}: {
  unidades: Unidade[];
  configuracoes: ConfiguracaoEmitente[];
}) {
  const [unidadeId, setUnidadeId] = React.useState(unidades[0]?.id ?? "");
  const mapa = React.useMemo(() => new Map(configuracoes.map((c) => [c.unidade_id, c])), [configuracoes]);

  if (unidades.length === 0) {
    return <p className="text-muted-foreground">Nenhuma unidade ativa cadastrada.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
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

      <FormularioUnidade
        key={unidadeId}
        unidadeId={unidadeId}
        configuracaoInicial={mapa.get(unidadeId) ?? campoVazio(unidadeId)}
      />
    </div>
  );
}

function FormularioUnidade({
  unidadeId,
  configuracaoInicial,
}: {
  unidadeId: string;
  configuracaoInicial: ConfiguracaoEmitente;
}) {
  const router = useRouter();
  const [config, setConfig] = React.useState(configuracaoInicial);
  const [salvando, setSalvando] = React.useState(false);

  function campo<K extends keyof ConfiguracaoEmitente>(chave: K, valor: ConfiguracaoEmitente[K]) {
    setConfig((atual) => ({ ...atual, [chave]: valor }));
  }

  async function salvar() {
    if (
      !config.razao_social.trim() ||
      !config.documento.trim() ||
      !config.endereco_logradouro.trim() ||
      !config.endereco_cidade.trim() ||
      !config.endereco_uf.trim() ||
      !config.assinante_nome_padrao.trim()
    ) {
      toast.error("Preencha razão social, documento, endereço, cidade, UF e assinante padrão.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.from("configuracao_emitente").upsert(
      {
        unidade_id: unidadeId,
        razao_social: config.razao_social.trim(),
        nome_fantasia: config.nome_fantasia?.trim() || null,
        documento: config.documento.trim(),
        inscricao_municipal: config.inscricao_municipal?.trim() || null,
        endereco_logradouro: config.endereco_logradouro.trim(),
        endereco_numero: config.endereco_numero?.trim() || null,
        endereco_bairro: config.endereco_bairro?.trim() || null,
        endereco_cidade: config.endereco_cidade.trim(),
        endereco_uf: config.endereco_uf.trim().toUpperCase(),
        endereco_cep: config.endereco_cep?.trim() || null,
        telefone: config.telefone?.trim() || null,
        email: config.email?.trim() || null,
        assinante_nome_padrao: config.assinante_nome_padrao.trim(),
        serie: config.serie.trim() || "A",
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "unidade_id" }
    );
    setSalvando(false);

    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Configuração salva.");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Razão social</Label>
          <Input value={config.razao_social} onChange={(e) => campo("razao_social", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Nome fantasia (opcional)</Label>
          <Input
            value={config.nome_fantasia ?? ""}
            onChange={(e) => campo("nome_fantasia", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>CNPJ/CPF</Label>
          <Input value={config.documento} onChange={(e) => campo("documento", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Inscrição municipal (opcional)</Label>
          <Input
            value={config.inscricao_municipal ?? ""}
            onChange={(e) => campo("inscricao_municipal", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Endereço</Label>
          <Input
            value={config.endereco_logradouro}
            onChange={(e) => campo("endereco_logradouro", e.target.value)}
            placeholder="Logradouro"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Número (opcional)</Label>
          <Input
            value={config.endereco_numero ?? ""}
            onChange={(e) => campo("endereco_numero", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Bairro (opcional)</Label>
          <Input
            value={config.endereco_bairro ?? ""}
            onChange={(e) => campo("endereco_bairro", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Cidade</Label>
          <Input value={config.endereco_cidade} onChange={(e) => campo("endereco_cidade", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>UF</Label>
          <Input
            value={config.endereco_uf}
            onChange={(e) => campo("endereco_uf", e.target.value)}
            maxLength={2}
            className="w-20 uppercase"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>CEP (opcional)</Label>
          <Input value={config.endereco_cep ?? ""} onChange={(e) => campo("endereco_cep", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Telefone (opcional)</Label>
          <Input value={config.telefone ?? ""} onChange={(e) => campo("telefone", e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>E-mail (opcional)</Label>
          <Input value={config.email ?? ""} onChange={(e) => campo("email", e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Série da numeração</Label>
          <Input value={config.serie} onChange={(e) => campo("serie", e.target.value)} className="w-20" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Nome do assinante padrão</Label>
          <Input
            value={config.assinante_nome_padrao}
            onChange={(e) => campo("assinante_nome_padrao", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Sugestão preenchida na emissão — pode ser trocado a cada recibo.
          </p>
        </div>

        <Button className="w-fit" disabled={salvando} onClick={salvar}>
          {salvando && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
