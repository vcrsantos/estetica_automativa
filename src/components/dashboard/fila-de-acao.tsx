"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { montarMensagemReativacao } from "@/lib/reativacao-mensagens";
import { useUnidade } from "@/components/providers/unidade-provider";
import type { Cliente, ClienteParaReativar, Orcamento } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const LIMITE = 4;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasDesde(dataIso: string) {
  return Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000);
}

type OrcamentoPendente = Orcamento & { cliente: Cliente | null };

/** Fila de ação (seção 3.6 do escopo de melhorias): clientes a reativar e orçamentos sem resposta, cada linha com botão de WhatsApp e mensagem pré-preenchida. */
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

  const semNada = !carregando && clientes.length === 0 && orcamentos.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Fila de ação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {carregando && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {semNada && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada pendente por aqui.</p>
        )}

        {!carregando && clientes.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Clientes a reativar
              </p>
              <Link href="/reativacao" className="text-xs font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            {clientes.map((cliente) => (
              <div
                key={cliente.cliente_id}
                className="flex items-center justify-between gap-2 rounded-md border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{cliente.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    há {cliente.dias_desde_ultimo} dias · {formatarMoeda(cliente.valor_total_gasto)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Chamar no WhatsApp"
                  disabled={!cliente.telefone}
                  onClick={() => contatarCliente(cliente)}
                >
                  <MessageCircle className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!carregando && orcamentos.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Orçamentos sem resposta
              </p>
              <Link href="/orcamentos" className="text-xs font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            {orcamentos.map((orcamento) => (
              <Link
                key={orcamento.id}
                href={`/orcamentos/${orcamento.id}`}
                className="flex items-center justify-between gap-2 rounded-md border p-2 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {orcamento.contato_nome || orcamento.cliente?.nome || `Orçamento #${orcamento.numero}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    há {diasDesde(orcamento.criado_em)} dias · {formatarMoeda(orcamento.valor_total)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Chamar no WhatsApp"
                  disabled={!(orcamento.contato_telefone || orcamento.cliente?.telefone)}
                  onClick={(e) => {
                    e.preventDefault();
                    contatarOrcamento(orcamento);
                  }}
                >
                  <MessageCircle className="size-4" />
                </Button>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
