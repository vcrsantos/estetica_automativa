"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { linkWhatsApp } from "@/lib/whatsapp";
import { useUnidade } from "@/components/providers/unidade-provider";
import { STATUS_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import type { Cliente, OrdemServico, OsItem } from "@/types/database";
import { StatusPagamentoBadge } from "@/components/ordens/status-pagamento-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type GrupoCliente = {
  cliente: Cliente;
  ordens: (OrdemServico & { itens: OsItem[] })[];
  total: number;
  diasEmAbertoMax: number;
};

function montarMensagemCobranca(grupo: GrupoCliente) {
  const primeiroNome = grupo.cliente.nome.split(" ")[0];
  const linhas = grupo.ordens
    .map((os) => {
      const data = new Date(os.entrada_em).toLocaleDateString("pt-BR");
      const servicos = os.itens.map((i) => i.descricao).join(", ") || "Serviço";
      const status = STATUS_PAGAMENTO_LABELS[os.status_pagamento].toLowerCase();
      return `• ${data} — ${servicos} — ${formatarMoeda(os.valor_total)} (${status})`;
    })
    .join("\n");

  return `Oi, ${primeiroNome}! Passando pra deixar tudo certinho: aqui está um resumo dos serviços em aberto na POLIBRILHO:\n\n${linhas}\n\nTotal em aberto: ${formatarMoeda(grupo.total)}\n\nQualquer dúvida é só chamar! 💛`;
}

export function ContasAReceberList() {
  const { unidadeSelecionadaId } = useUnidade();
  const [grupos, setGrupos] = React.useState<GrupoCliente[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      const supabase = createClient();

      let query = supabase
        .from("ordens_servico")
        .select("*")
        .in("status_pagamento", ["pendente", "parcial"])
        .neq("status", "cancelado")
        .order("entrada_em", { ascending: true });

      if (unidadeSelecionadaId) {
        query = query.eq("unidade_id", unidadeSelecionadaId);
      }

      const { data: ordens } = await query;
      if (cancelado || !ordens || ordens.length === 0) {
        setGrupos([]);
        setCarregando(false);
        return;
      }

      const clienteIds = [...new Set(ordens.map((o) => o.cliente_id))];
      const osIds = ordens.map((o) => o.id);

      const [{ data: clientesData }, { data: itensData }] = await Promise.all([
        supabase.from("clientes").select("*").in("id", clienteIds),
        supabase.from("os_itens").select("*").in("os_id", osIds),
      ]);

      if (cancelado) return;

      const clientesMap = new Map((clientesData ?? []).map((c) => [c.id, c]));
      const itensPorOs = new Map<string, OsItem[]>();
      for (const item of itensData ?? []) {
        const lista = itensPorOs.get(item.os_id) ?? [];
        lista.push(item);
        itensPorOs.set(item.os_id, lista);
      }

      const gruposMap = new Map<string, GrupoCliente>();
      const agora = Date.now();

      for (const os of ordens) {
        const cliente = clientesMap.get(os.cliente_id);
        if (!cliente) continue;

        const diasEmAberto = Math.floor((agora - new Date(os.entrada_em).getTime()) / 86400000);
        const existente = gruposMap.get(cliente.id);
        const osComItens = { ...os, itens: itensPorOs.get(os.id) ?? [] };

        if (existente) {
          existente.ordens.push(osComItens);
          existente.total += os.valor_total;
          existente.diasEmAbertoMax = Math.max(existente.diasEmAbertoMax, diasEmAberto);
        } else {
          gruposMap.set(cliente.id, {
            cliente,
            ordens: [osComItens],
            total: os.valor_total,
            diasEmAbertoMax: diasEmAberto,
          });
        }
      }

      const lista = Array.from(gruposMap.values()).sort((a, b) => b.diasEmAbertoMax - a.diasEmAbertoMax);
      setGrupos(lista);
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [unidadeSelecionadaId]);

  const totalGeral = grupos.reduce((acc, g) => acc + g.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas a receber</h1>
        <p className="text-muted-foreground">
          Clientes com serviços pagos parcialmente ou ainda pendentes, do mais antigo para o mais
          recente.
        </p>
      </div>

      {!carregando && grupos.length > 0 && (
        <Card className="max-w-xs">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total em aberto</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{formatarMoeda(totalGeral)}</p>
          </CardContent>
        </Card>
      )}

      {carregando && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!carregando && grupos.length === 0 && (
        <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma conta em aberto. 🎉
        </p>
      )}

      <div className="flex flex-col gap-3">
        {grupos.map((grupo) => (
          <Card key={grupo.cliente.id}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">
                  <Link href={`/clientes/${grupo.cliente.id}`} className="hover:underline">
                    {grupo.cliente.nome}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{grupo.cliente.telefone || "Sem telefone"}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-lg font-bold tabular-nums">{formatarMoeda(grupo.total)}</p>
                <p className="text-xs text-muted-foreground">há {grupo.diasEmAbertoMax} dias</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {grupo.ordens.map((os) => (
                <Link
                  key={os.id}
                  href={`/ordens/${os.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                >
                  <div>
                    <p>{os.itens.map((i) => i.descricao).join(", ") || "Serviço"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(os.entrada_em).toLocaleDateString("pt-BR")} · #{os.numero}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPagamentoBadge status={os.status_pagamento} />
                    <span className="font-medium">{formatarMoeda(os.valor_total)}</span>
                  </div>
                </Link>
              ))}

              {grupo.cliente.telefone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  nativeButton={false}
                  render={
                    <a
                      href={linkWhatsApp(grupo.cliente.telefone, montarMensagemCobranca(grupo))}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <MessageCircle className="size-4" />
                  Enviar resumo por WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
