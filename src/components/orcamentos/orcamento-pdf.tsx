import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { CORES_PDF as CORES } from "@/lib/pdf-design-system";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { Cliente, Orcamento, OrcamentoItem, Unidade, Veiculo } from "@/types/database";

// Mesmo design system dos demais documentos (ver prestacao-pdf.tsx) — hex e
// escala tipográfica do design-system-polibrilho-prestacao-contas.md.
// Helvetica no lugar de Aptos pela mesma razão de licenciamento já
// explicada: @react-pdf/renderer só embute fonte a partir de arquivo, e a
// Aptos não tem um redistribuível disponível.
const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 11, color: CORES.textPrimary, backgroundColor: CORES.surface },

  cabecalho: {
    backgroundColor: CORES.brandNavy,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderBottomWidth: 7,
    borderBottomColor: CORES.brandYellow,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  marca: { fontSize: 24, fontWeight: 700 },
  marcaPoli: { color: CORES.brandYellow },
  marcaBrilho: { color: "#ffffff" },
  marcaSub: { fontSize: 8, color: "#ffffff", opacity: 0.65, marginTop: 3, letterSpacing: 0.5 },
  cabecalhoDireita: { alignItems: "flex-end" },
  documentoTitulo: { fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 },
  documentoSub: { fontSize: 9, color: "#ffffff", opacity: 0.65, marginTop: 4 },

  corpo: { paddingHorizontal: 36, paddingTop: 24, paddingBottom: 56 },

  caixaInfo: {
    flexDirection: "row",
    backgroundColor: CORES.surfaceSoft,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 9, fontWeight: 700, color: CORES.textSecondary, textTransform: "uppercase" },
  infoValor: { fontSize: 12, fontWeight: 400, color: CORES.textPrimary, marginTop: 8 },

  tabelaHeaderRow: { flexDirection: "row", backgroundColor: CORES.navy900, paddingVertical: 7, paddingHorizontal: 8 },
  th: { fontSize: 9, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
  tabelaLinha: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: CORES.border,
  },
  linhaPar: { backgroundColor: CORES.surfaceRow },
  colDescricao: { flex: 1, fontSize: 11, color: CORES.textPrimary },
  colValor: { width: 84, textAlign: "right", fontSize: 11, color: CORES.textPrimary },

  linhaAjuste: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 16 },
  ajusteLabel: { fontSize: 10, color: CORES.textSecondary },
  ajusteValor: { fontSize: 10, color: CORES.textPrimary },

  resumoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 16 },
  resumoTexto: { fontSize: 9, color: CORES.textMuted, maxWidth: 260, lineHeight: 1.4 },
  totalBox: {
    backgroundColor: CORES.highlightSoft,
    borderRadius: 4,
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 12, fontWeight: 700, color: CORES.textPrimary },
  totalValor: { fontSize: 16, fontWeight: 700, color: CORES.textPrimary },

  secao: { marginBottom: 14 },
  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: CORES.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  secaoTexto: { fontSize: 10, color: CORES.textSecondary },

  rodape: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: CORES.border,
    paddingTop: 12,
  },
  rodapeTexto: { fontSize: 8, color: CORES.textMuted },
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

  const veiculoTexto = veiculo
    ? `${veiculo.placa || "Sem placa"} — ${veiculo.marca ?? ""} ${veiculo.modelo ?? ""} · ${PORTE_LABELS[veiculo.porte]}`
    : orcamento.porte
      ? `Porte: ${PORTE_LABELS[orcamento.porte]}`
      : orcamento.endereco_atendimento
        ? `Atendimento externo — ${orcamento.endereco_atendimento}`
        : "Atendimento sem veículo";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.cabecalho}>
          <View>
            <Text style={styles.marca}>
              <Text style={styles.marcaPoli}>POLI</Text>
              <Text style={styles.marcaBrilho}>BRILHO</Text>
            </Text>
            <Text style={styles.marcaSub}>ESTÉTICA AUTOMOTIVA</Text>
          </View>
          <View style={styles.cabecalhoDireita}>
            <Text style={styles.documentoTitulo}>ORÇAMENTO</Text>
            <Text style={styles.documentoSub}>
              Nº {orcamento.numero} · Emitido em {formatarData(orcamento.criado_em)}
            </Text>
          </View>
        </View>

        <View style={styles.corpo}>
          <View style={styles.caixaInfo}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValor}>{nomeCliente}</Text>
              <Text style={[styles.infoValor, { fontSize: 10, marginTop: 2, color: CORES.textSecondary }]}>
                {telefoneCliente}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Veículo</Text>
              <Text style={styles.infoValor}>{veiculoTexto}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Válido até</Text>
              <Text style={styles.infoValor}>{formatarData(orcamento.validade_em)}</Text>
            </View>
          </View>

          <View style={styles.tabelaHeaderRow}>
            <Text style={[styles.th, { flex: 1 }]}>Serviço</Text>
            <Text style={[styles.th, { width: 84, textAlign: "right" }]}>Valor</Text>
          </View>
          {itens.map((item, i) => (
            <View key={item.id} style={[styles.tabelaLinha, i % 2 === 1 ? styles.linhaPar : undefined]}>
              <Text style={styles.colDescricao}>{item.descricao}</Text>
              <Text style={styles.colValor}>{formatarMoeda(item.valor)}</Text>
            </View>
          ))}

          {orcamento.desconto > 0 && (
            <>
              <View style={styles.linhaAjuste}>
                <Text style={styles.ajusteLabel}>Subtotal</Text>
                <Text style={styles.ajusteValor}>{formatarMoeda(subtotal)}</Text>
              </View>
              <View style={styles.linhaAjuste}>
                <Text style={styles.ajusteLabel}>Desconto</Text>
                <Text style={styles.ajusteValor}>- {formatarMoeda(orcamento.desconto)}</Text>
              </View>
            </>
          )}

          <View style={styles.resumoRow}>
            <Text style={styles.resumoTexto}>
              {orcamento.condicoes || "Orçamento sujeito a confirmação de agenda."}
            </Text>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValor}>{formatarMoeda(orcamento.valor_total)}</Text>
            </View>
          </View>

          {orcamento.observacoes && (
            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>Observações</Text>
              <Text style={styles.secaoTexto}>{orcamento.observacoes}</Text>
            </View>
          )}
        </View>

        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>Orçamento sujeito a confirmação de agenda.</Text>
          <Text style={styles.rodapeTexto}>
            PoliBrilho {unidade.nome}
            {unidade.telefone ? ` · ${unidade.telefone}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
