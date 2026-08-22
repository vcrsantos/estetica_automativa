import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { CORES_PDF as CORES } from "@/lib/pdf-design-system";
import type { OrdemServico, Recibo, ReciboItem } from "@/types/database";

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
  emitenteInfo: { fontSize: 8, color: "#ffffff", opacity: 0.65, marginTop: 3 },
  cabecalhoDireita: { alignItems: "flex-end" },
  documentoTitulo: { fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 },
  documentoSub: { fontSize: 9, color: "#ffffff", opacity: 0.65, marginTop: 4 },

  corpo: { paddingHorizontal: 36, paddingTop: 24, paddingBottom: 60 },

  caixaTexto: {
    backgroundColor: CORES.surfaceSoft,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  corpoTexto: { fontSize: 12, lineHeight: 1.5, color: CORES.textPrimary },

  secao: { marginBottom: 16 },
  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: CORES.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
  },

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
  colQtd: { width: 40, textAlign: "right", fontSize: 11, color: CORES.textPrimary },
  colValor: { width: 74, textAlign: "right", fontSize: 11, color: CORES.textPrimary },

  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaItem: { fontSize: 11, color: CORES.textSecondary, marginRight: 24 },

  resumoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 16 },
  extensoTexto: { fontSize: 9, color: CORES.textMuted, maxWidth: 260, lineHeight: 1.4 },
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

  assinaturaBloco: { marginTop: 36, alignItems: "center" },
  assinaturaLocal: { fontSize: 11, color: CORES.textPrimary, marginBottom: 28 },
  linhaAssinatura: { borderTopWidth: 1, borderTopColor: CORES.textPrimary, width: 240, marginBottom: 6 },
  assinaturaNome: { fontSize: 10, color: CORES.textPrimary },

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

  marcaDagua: {
    position: "absolute",
    top: "42%",
    left: "18%",
    fontSize: 60,
    fontWeight: 700,
    color: CORES.cancelado,
    opacity: 0.25,
    transform: "rotate(-25deg)",
  },
});

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarDataExtenso(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ReciboPdf({
  recibo,
  itens,
  osVinculadas,
}: {
  recibo: Recibo;
  itens: ReciboItem[];
  osVinculadas: OrdemServico[];
}) {
  const emitente = recibo.emitente_snapshot;
  const tomador = recibo.tomador_snapshot;
  const cancelado = recibo.status === "cancelado";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {cancelado && <Text style={styles.marcaDagua}>CANCELADO</Text>}

        <View style={styles.cabecalho}>
          <View>
            <Text style={styles.marca}>
              <Text style={styles.marcaPoli}>POLI</Text>
              <Text style={styles.marcaBrilho}>BRILHO</Text>
            </Text>
            <Text style={styles.emitenteInfo}>
              {emitente.razao_social} · {emitente.documento}
            </Text>
            <Text style={styles.emitenteInfo}>
              {emitente.endereco_logradouro}
              {emitente.endereco_numero ? `, ${emitente.endereco_numero}` : ""} —{" "}
              {emitente.endereco_cidade}/{emitente.endereco_uf}
            </Text>
          </View>
          <View style={styles.cabecalhoDireita}>
            <Text style={styles.documentoTitulo}>RECIBO DE PRESTAÇÃO DE SERVIÇO</Text>
            <Text style={styles.documentoSub}>
              Nº {String(recibo.numero).padStart(6, "0")} · Série {recibo.serie} ·{" "}
              {formatarData(recibo.data_emissao)}
            </Text>
          </View>
        </View>

        <View style={styles.corpo}>
          <View style={styles.caixaTexto}>
            <Text style={styles.corpoTexto}>
              Recebemos de {tomador.nome_exibicao}
              {tomador.documento ? `, inscrito(a) no CPF/CNPJ nº ${tomador.documento},` : ","} a
              importância de {recibo.valor_extenso}, referente a {recibo.referente_a}.
            </Text>
          </View>

          {itens.length > 1 && (
            <View style={styles.secao}>
              <View style={styles.tabelaHeaderRow}>
                <Text style={[styles.th, { flex: 1 }]}>Descrição</Text>
                <Text style={[styles.th, { width: 40, textAlign: "right" }]}>Qtd.</Text>
                <Text style={[styles.th, { width: 74, textAlign: "right" }]}>Valor</Text>
              </View>
              {itens.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.tabelaLinha, i % 2 === 1 ? styles.linhaPar : undefined]}
                >
                  <Text style={styles.colDescricao}>{item.descricao}</Text>
                  <Text style={styles.colQtd}>{item.quantidade}</Text>
                  <Text style={styles.colValor}>{formatarMoeda(item.valor_total)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>Forma de pagamento: {recibo.forma_pagamento}</Text>
            <Text style={styles.metaItem}>Data do pagamento: {formatarData(recibo.data_pagamento)}</Text>
            {osVinculadas.length > 0 && (
              <Text style={styles.metaItem}>
                OS incluídas: {osVinculadas.map((os) => `#${os.numero}`).join(", ")}
              </Text>
            )}
          </View>

          <View style={styles.resumoRow}>
            <Text style={styles.extensoTexto}>{recibo.valor_extenso}</Text>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValor}>{formatarMoeda(recibo.valor)}</Text>
            </View>
          </View>

          {recibo.observacoes && (
            <View style={styles.secao}>
              <Text style={styles.secaoTitulo}>Observações</Text>
              <Text style={{ fontSize: 10, color: CORES.textSecondary }}>{recibo.observacoes}</Text>
            </View>
          )}

          <View style={styles.assinaturaBloco}>
            <Text style={styles.assinaturaLocal}>
              {recibo.local_emissao}, {formatarDataExtenso(new Date(recibo.data_emissao))}.
            </Text>
            <View style={styles.linhaAssinatura} />
            <Text style={styles.assinaturaNome}>{recibo.assinante_nome}</Text>
          </View>
        </View>

        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>
            Este documento é um recibo de prestação de serviço e não constitui documento fiscal.
          </Text>
          <Text style={styles.rodapeTexto}>PoliBrilho Estética Automotiva</Text>
        </View>
      </Page>
    </Document>
  );
}
