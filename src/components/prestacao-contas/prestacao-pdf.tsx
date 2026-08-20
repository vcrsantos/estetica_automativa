import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { ConfiguracaoEmitente, PrestacaoConta, PrestacaoContaItem } from "@/types/database";

function veiculoLinha(item: PrestacaoContaItem) {
  const nome = item.veiculo_nome || "Sem veículo";
  const placa = item.veiculo_placa || "sem placa";
  const porte = item.veiculo_porte ? PORTE_LABELS[item.veiculo_porte] : null;
  return `${nome} — ${placa}${porte ? ` · ${porte}` : ""}`;
}

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
  colData: { width: 60 },
  colVeiculo: { flex: 1 },
  colDescricao: { flex: 1.4 },
  colValor: { width: 70, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 16 },
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

function formatarData(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export function PrestacaoPdf({
  prestacao,
  itens,
  emitente,
}: {
  prestacao: PrestacaoConta;
  itens: PrestacaoContaItem[];
  emitente: ConfiguracaoEmitente | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{emitente?.nome_fantasia || emitente?.razao_social || "POLIBRILHO"}</Text>
            {emitente && (
              <>
                <Text style={styles.emitenteInfo}>
                  {emitente.razao_social} · {emitente.documento}
                </Text>
                <Text style={styles.emitenteInfo}>
                  {emitente.endereco_logradouro}
                  {emitente.endereco_numero ? `, ${emitente.endereco_numero}` : ""} —{" "}
                  {emitente.endereco_cidade}/{emitente.endereco_uf}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.tituloRow}>
          <View>
            <Text style={styles.titulo}>PRESTAÇÃO DE CONTAS</Text>
            <Text style={styles.subtitulo}>
              {prestacao.numero} · {prestacao.cliente_nome}
              {prestacao.documento ? ` · ${prestacao.documento}` : ""}
            </Text>
            <Text style={styles.subtitulo}>
              Período: {formatarData(prestacao.data_inicio)} a {formatarData(prestacao.data_fim)}
              {prestacao.data_vencimento ? ` · Vencimento: ${formatarData(prestacao.data_vencimento)}` : ""}
            </Text>
          </View>
          <Text style={styles.valorGrande}>{formatarMoeda(prestacao.valor_total)}</Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Serviços</Text>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.colData, { fontWeight: 700 }]}>Data</Text>
            <Text style={[styles.colVeiculo, { fontWeight: 700 }]}>Veículo</Text>
            <Text style={[styles.colDescricao, { fontWeight: 700 }]}>Descrição</Text>
            <Text style={[styles.colValor, { fontWeight: 700 }]}>Valor</Text>
          </View>
          {itens.map((item) => (
            <View key={item.id} style={styles.tabelaLinha}>
              <Text style={styles.colData}>{formatarData(item.data)}</Text>
              <Text style={styles.colVeiculo}>{veiculoLinha(item)}</Text>
              <Text style={styles.colDescricao}>{item.descricao}</Text>
              <Text style={styles.colValor}>{formatarMoeda(item.valor)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ({itens.length} serviço{itens.length === 1 ? "" : "s"})</Text>
            <Text style={styles.totalValor}>{formatarMoeda(prestacao.valor_total)}</Text>
          </View>
        </View>

        {prestacao.observacoes && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Observações</Text>
            <Text>{prestacao.observacoes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Documento de controle dos serviços realizados. Não substitui nota fiscal.
        </Text>
      </Page>
    </Document>
  );
}
