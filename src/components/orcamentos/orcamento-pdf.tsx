import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente, Orcamento, OrcamentoItem, Unidade, Veiculo } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  brand: { fontSize: 20, fontWeight: 700, color: "#0d7d72" },
  unidadeInfo: { textAlign: "right", fontSize: 9, color: "#444444" },
  tituloOrcamento: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitulo: { fontSize: 9, color: "#555555", marginBottom: 16 },
  secao: { marginBottom: 14 },
  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0d7d72",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  linha: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  tabelaHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #0d7d72",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tabelaLinha: {
    flexDirection: "row",
    borderBottom: "1px solid #eeeeee",
    paddingVertical: 4,
  },
  colDescricao: { flex: 1 },
  colValor: { width: 80, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 16,
  },
  totalLabel: { fontSize: 11, fontWeight: 700 },
  totalValor: { fontSize: 12, fontWeight: 700, color: "#0d7d72" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#888888",
    textAlign: "center",
    borderTop: "1px solid #eeeeee",
    paddingTop: 8,
  },
});

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function OrcamentoPdf({
  orcamento,
  unidade,
  cliente,
  veiculo,
  itens,
}: {
  orcamento: Orcamento;
  unidade: Unidade;
  cliente: Cliente | null;
  veiculo: Veiculo | null;
  itens: OrcamentoItem[];
}) {
  const nomeCliente = cliente?.nome ?? orcamento.contato_nome ?? "—";
  const telefoneCliente = cliente?.telefone ?? orcamento.contato_telefone ?? "—";
  const subtotal = itens.reduce((acc, i) => acc + i.valor, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>POLIBRILHO</Text>
          <View style={styles.unidadeInfo}>
            <Text>{unidade.nome}</Text>
            {unidade.endereco && <Text>{unidade.endereco}</Text>}
            {unidade.telefone && <Text>{unidade.telefone}</Text>}
          </View>
        </View>

        <Text style={styles.tituloOrcamento}>Orçamento #{orcamento.numero}</Text>
        <Text style={styles.subtitulo}>
          Emitido em {formatarData(orcamento.criado_em)} · Válido até{" "}
          {formatarData(orcamento.validade_em)}
        </Text>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Cliente</Text>
          <View style={styles.linha}>
            <Text>{nomeCliente}</Text>
            <Text>{telefoneCliente}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Veículo</Text>
          {veiculo ? (
            <Text>
              {veiculo.placa || "Sem placa"} — {veiculo.marca} {veiculo.modelo} ·{" "}
              {PORTE_LABELS[veiculo.porte]}
            </Text>
          ) : orcamento.porte ? (
            <Text>Porte: {PORTE_LABELS[orcamento.porte]}</Text>
          ) : (
            <Text>Atendimento sem veículo{orcamento.endereco_atendimento ? " — " + orcamento.endereco_atendimento : ""}</Text>
          )}
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Serviços</Text>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.colDescricao, { fontWeight: 700 }]}>Descrição</Text>
            <Text style={[styles.colValor, { fontWeight: 700 }]}>Valor</Text>
          </View>
          {itens.map((item) => (
            <View key={item.id} style={styles.tabelaLinha}>
              <Text style={styles.colDescricao}>{item.descricao}</Text>
              <Text style={styles.colValor}>{formatarMoeda(item.valor)}</Text>
            </View>
          ))}

          {orcamento.desconto > 0 && (
            <View style={[styles.linha, { marginTop: 6 }]}>
              <Text>Subtotal</Text>
              <Text>{formatarMoeda(subtotal)}</Text>
            </View>
          )}
          {orcamento.desconto > 0 && (
            <View style={styles.linha}>
              <Text>Desconto</Text>
              <Text>- {formatarMoeda(orcamento.desconto)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>{formatarMoeda(orcamento.valor_total)}</Text>
          </View>
        </View>

        {orcamento.condicoes && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Condições de pagamento</Text>
            <Text>{orcamento.condicoes}</Text>
          </View>
        )}

        {orcamento.observacoes && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Observações</Text>
            <Text>{orcamento.observacoes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          POLIBRILHO {unidade.nome}
          {unidade.telefone ? ` · ${unidade.telefone}` : ""} — orçamento sujeito a confirmação de
          agenda.
        </Text>
      </Page>
    </Document>
  );
}
