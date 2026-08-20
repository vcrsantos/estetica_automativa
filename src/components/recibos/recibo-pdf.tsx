import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { OrdemServico, Recibo, ReciboItem } from "@/types/database";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  brand: { fontSize: 16, fontWeight: 700, color: "#0d7d72" },
  emitenteInfo: { fontSize: 8, color: "#444444", marginTop: 2 },
  tituloRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  titulo: { fontSize: 13, fontWeight: 700 },
  subtitulo: { fontSize: 9, color: "#555555", marginTop: 2 },
  valorGrande: { fontSize: 16, fontWeight: 700, color: "#0d7d72" },
  secao: { marginBottom: 14 },
  corpo: { fontSize: 11, lineHeight: 1.6 },
  secaoTitulo: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0d7d72",
    marginBottom: 4,
    textTransform: "uppercase",
  },
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
  colQtd: { width: 40, textAlign: "right" },
  colValor: { width: 70, textAlign: "right" },
  assinaturaBloco: { marginTop: 40, alignItems: "center" },
  linhaAssinatura: { borderTop: "1px solid #111111", width: 240, marginBottom: 4 },
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
  marcaDagua: {
    position: "absolute",
    top: "42%",
    left: "18%",
    fontSize: 60,
    color: "#dc2626",
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

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{emitente.nome_fantasia || emitente.razao_social}</Text>
            <Text style={styles.emitenteInfo}>
              {emitente.razao_social} · {emitente.documento}
            </Text>
            <Text style={styles.emitenteInfo}>
              {emitente.endereco_logradouro}
              {emitente.endereco_numero ? `, ${emitente.endereco_numero}` : ""} —{" "}
              {emitente.endereco_cidade}/{emitente.endereco_uf}
            </Text>
            {emitente.telefone && <Text style={styles.emitenteInfo}>{emitente.telefone}</Text>}
          </View>
        </View>

        <View style={styles.tituloRow}>
          <View>
            <Text style={styles.titulo}>RECIBO DE PRESTAÇÃO DE SERVIÇO</Text>
            <Text style={styles.subtitulo}>
              Nº {String(recibo.numero).padStart(6, "0")} · Série {recibo.serie} ·{" "}
              {formatarData(recibo.data_emissao)}
            </Text>
          </View>
          <Text style={styles.valorGrande}>{formatarMoeda(recibo.valor)}</Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.corpo}>
            Recebemos de {tomador.nome_exibicao}
            {tomador.documento ? `, inscrito(a) no CPF/CNPJ nº ${tomador.documento},` : ","} a importância
            de {recibo.valor_extenso}, referente a {recibo.referente_a}.
          </Text>
        </View>

        {itens.length > 1 && (
          <View style={styles.secao}>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.colDescricao, { fontWeight: 700 }]}>Descrição</Text>
              <Text style={[styles.colQtd, { fontWeight: 700 }]}>Qtd.</Text>
              <Text style={[styles.colValor, { fontWeight: 700 }]}>Valor</Text>
            </View>
            {itens.map((item) => (
              <View key={item.id} style={styles.tabelaLinha}>
                <Text style={styles.colDescricao}>{item.descricao}</Text>
                <Text style={styles.colQtd}>{item.quantidade}</Text>
                <Text style={styles.colValor}>{formatarMoeda(item.valor_total)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.secao}>
          <Text style={{ marginBottom: 2 }}>Forma de pagamento: {recibo.forma_pagamento}</Text>
          <Text style={{ marginBottom: 2 }}>Data do pagamento: {formatarData(recibo.data_pagamento)}</Text>
          {osVinculadas.length > 0 && (
            <Text>OS incluídas: {osVinculadas.map((os) => `#${os.numero}`).join(", ")}</Text>
          )}
        </View>

        {recibo.observacoes && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Observações</Text>
            <Text>{recibo.observacoes}</Text>
          </View>
        )}

        <View style={styles.assinaturaBloco}>
          <Text style={{ marginBottom: 24 }}>
            {recibo.local_emissao}, {formatarDataExtenso(new Date(recibo.data_emissao))}.
          </Text>
          <View style={styles.linhaAssinatura} />
          <Text>{recibo.assinante_nome}</Text>
        </View>

        <Text style={styles.footer}>
          Este documento é um recibo de prestação de serviço e não constitui documento fiscal.
        </Text>
      </Page>
    </Document>
  );
}
