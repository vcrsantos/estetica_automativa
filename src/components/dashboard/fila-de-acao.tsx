"use client";

import * as React from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { montarMensagemReativacao } from "@/lib/reativacao-mensagens";
import { useUnidade } from "@/components/providers/unidade-provider";
import { cn } from "@/lib/utils";
import type { Cliente, ClienteParaReativar, Orcamento } from "@/types/database";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LIMITE = 4;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function diasDesde(dataIso: string) {
  return Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000);
}

type OrcamentoPendente = Orcamento & { cliente: Cliente | null };

type ItemFila =
  | { id: string; tipo: "reativar"; nome: string; descricao: string; acaoLabel: string; disabled: boolean; onAcao: () => void }
  | {
      id: string;
      tipo: "orcamento";
      nome: string;
      descricao: string;
      valor: number;
      acaoLabel: string;
      disabled: boolean;
      onAcao: () => void;
    };

/** Fila de ação (seção 3.6 do escopo de melhorias): clientes a reativar e orçamentos sem resposta numa única lista, cada linha com a ação de WhatsApp já pré-preenchida. */
export function FilaDeAcao() {
  const { unidadeSelecionadaId } = useUnidade();
  const [clientes, setClientes] = React.useState<ClienteParaReativar[]>([]);
  const [orcamentos, setOrcamentos] = React.useState<OrcamentoPendente[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let queryOrcamentos = supabase
        .from("orcamentos")
        .select("*")
        .eq("status", "enviado")
        .order("criado_em", { ascending: true })
        .limit(LIMITE);
      if (unidadeSelecionadaId) {
        queryOrcamentos = queryOrcamentos.eq("unidade_id", unidadeSelecionadaId);
      }

      const [{ data: clientesData }, { data: orcamentosData }] = await Promise.all([
        supabase.rpc("clientes_para_reativar", { p_unidade_id: unidadeSelecionadaId }),
        queryOrcamentos,
      ]);

      if (cancelado) return;

      const clienteIds = [
        ...new Set((orcamentosData ?? []).map((o) => o.cliente_id).filter((id): id is string => !!id)),
      ];
      const { data: clientesOrcamento } = clienteIds.length
        ? await supabase.from("clientes").select("*").in("id", clienteIds)
        : { data: [] as Cliente[] };

      if (cancelado) return;

      const mapaClientes = new Map((clientesOrcamento ?? []).map((c) => [c.id, c]));
      setClientes((clientesData ?? []).slice(0, LIMITE));
      setOrcamentos(
        (orcamentosData ?? []).map((o) => ({
          ...o,
          cliente: o.cliente_id ? (mapaClientes.get(o.cliente_id) ?? null) : null,
        }))
      );
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  function contatarCliente(cliente: ClienteParaReativar) {
    if (!cliente.telefone) return;
    const mensagem = montarMensagemReativacao("leve", cliente.nome.split(" ")[0]);
    window.open(linkWhatsApp(cliente.telefone, mensagem), "_blank", "noopener,noreferrer");
  }

  function contatarOrcamento(orcamento: OrcamentoPendente) {
    const telefone = orcamento.contato_telefone || orcamento.cliente?.telefone;
    if (!telefone) return;
    const nome = (orcamento.contato_nome || orcamento.cliente?.nome || "").split(" ")[0];
    const mensagem = `Oi${nome ? `, ${nome}` : ""}! Passando pra saber se você já deu uma olhada no orçamento #${orcamento.numero} da POLIBRILHO. Posso te ajudar a fechar? 😊`;
    window.open(linkWhatsApp(telefone, mensagem), "_blank", "noopener,noreferrer");
  }

  const itens: ItemFila[] = [
    ...clientes.map(
      (cliente): ItemFila => ({
        id: `cliente-${cliente.cliente_id}`,
        tipo: "reativar",
        nome: cliente.nome,
        descricao: `Sem serviço há ${cliente.dias_desde_ultimo} dias · ${formatarMoeda(cliente.valor_total_gasto)}`,
        acaoLabel: "Reativar",
        disabled: !cliente.telefone,
        onAcao: () => contatarCliente(cliente),
      })
    ),
    ...orcamentos.map(
      (orcamento): ItemFila => ({
        id: `orcamento-${orcamento.id}`,
        tipo: "orcamento",
        nome: orcamento.contato_nome || orcamento.cliente?.nome || `Orçamento #${orcamento.numero}`,
        descricao: `Orçamento enviado há ${diasDesde(orcamento.criado_em)} dias, sem resposta`,
        valor: orcamento.valor_total,
        acaoLabel: "Cobrar retorno",
        disabled: !(orcamento.contato_telefone || orcamento.cliente?.telefone),
        onAcao: () => contatarOrcamento(orcamento),
      })
    ),
  ].slice(0, LIMITE);

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Fila de ação</CardTitle>
        <CardAction>
          <Link href="/reativacao" className="text-xs font-medium text-primary hover:underline">
            Ver tudo
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {carregando ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : itens.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nada pendente por aqui.</p>
        ) : (
          itens.map((item, i) => (
            <button
              type="button"
              key={item.id}
              onClick={item.onAcao}
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-3 border-border px-4 py-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                i < itens.length - 1 && "border-b"
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                {iniciais(item.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{item.descricao}</p>
              </div>
              <div className="shrink-0 text-right">
                {item.tipo === "orcamento" && (
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatarMoeda(item.valor)}</p>
                )}
                <p className="text-xs font-medium text-muted-foreground">{item.acaoLabel}</p>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
