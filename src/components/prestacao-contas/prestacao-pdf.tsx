import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { CORES_PDF as CORES } from "@/lib/pdf-design-system";
import { PORTE_LABELS } from "@/lib/validations/cliente";
import type { PrestacaoConta, PrestacaoContaItem } from "@/types/database";

// Fonte pedida é Arial/Aptos/Inter; @react-pdf/renderer só embute fontes a
// partir de um arquivo (Font.register) e a Aptos é proprietária da
// Microsoft, sem arquivo redistribuível pra embutir aqui (mesma limitação
// já explicada pro resto do site). Helvetica — uma das 14 fontes padrão do
// PDF — é o equivalente métrico mais próximo de Arial, então é o que fica.

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 11, color: CORES.textPrimary, backgroundColor: CORES.surface },

  cabecalho: {
    backgroundColor: CORES.brandNavy,
    minHeight: 92,
    paddingHorizontal: 42,
    paddingVertical: 20,
    borderBottomWidth: 7,
    borderBottomColor: CORES.brandYellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marca: { fontSize: 30, fontWeight: 700 },
  marcaPoli: { color: CORES.brandYellow },
  marcaBrilho: { color: "#ffffff" },
  marcaSub: { fontSize: 9, color: "#ffffff", opacity: 0.65, marginTop: 3, letterSpacing: 0.5 },
  cabecalhoDireita: { alignItems: "flex-end" },
  documentoTitulo: { fontSize: 16, fontWeight: 700, color: "#ffffff", letterSpacing: 0.5 },
  documentoSub: { fontSize: 9, color: "#ffffff", opacity: 0.65, marginTop: 4 },

  corpo: { paddingHorizontal: 42, paddingTop: 24, paddingBottom: 60 },

  tituloRelatorio: { fontSize: 28, fontWeight: 700, color: CORES.textPrimary, marginBottom: 18, lineHeight: 1.2 },

  caixaInfo: {
    flexDirection: "row",
    backgroundColor: CORES.surfaceSoft,
    borderRadius: 4,
    padding: 18,
    marginBottom: 16,
  },
  infoCol: { flex: 1 },
  infoLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: CORES.textSecondary,
    textTransform: "uppercase",
  },
  infoValor: { fontSize: 13, fontWeight: 400, color: CORES.textPrimary, marginTop: 10 },

  metaRow: { flexDirection: "row", marginTop: 18, marginBottom: 16 },
  metaItem: { fontSize: 11, color: CORES.textSecondary, marginRight: 24 },

  tabelaHeaderRow: { flexDirection: "row", backgroundColor: CORES.navy900, paddingVertical: 8, paddingHorizontal: 10 },
  th: { fontSize: 10, fontWeight: 700, color: "#ffffff", textTransform: "uppercase" },
  colNumero: { width: "4%" },
  colData: { width: "9%" },
  colVeiculo: { width: "17%" },
  colPlaca: { width: "10%" },
  colServico: { width: "48%" },
  colValor: { width: "12%", textAlign: "right" },

  tabelaLinha: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: CORES.border,
    alignItems: "flex-start",
  },
  linhaPar: { backgroundColor: CORES.surfaceRow },
  numeroTexto: { fontSize: 11, color: CORES.textPrimary },
  dataTexto: { fontSize: 11, color: CORES.textPrimary },
  cellMain: { fontSize: 11, color: CORES.textPrimary },
  cellHelper: { fontSize: 9, color: CORES.textMuted, marginTop: 4 },
  placaTexto: { fontSize: 11, color: CORES.textPrimary },
  valorTexto: { fontSize: 11, color: CORES.textPrimary, textAlign: "right" },

  resumoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 },
  resumoTitulo: { fontSize: 12, fontWeight: 700, color: CORES.textPrimary },
  resumoSub: { fontSize: 9, color: CORES.textMuted, marginTop: 8 },
  totalBox: {
    backgroundColor: CORES.highlightSoft,
    borderRadius: 4,
    minWidth: 300,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 13, fontWeight: 700, color: CORES.textPrimary },
  totalValor: { fontSize: 18, fontWeight: 700, color: CORES.textPrimary },

  rodape: {
    position: "absolute",
    bottom: 28,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: CORES.border,
    paddingTop: 14,
  },
  rodapeTexto: { fontSize: 8, color: CORES.textMuted },
});

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string) {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleDateString("pt-BR");
}

export function PrestacaoPdf({
  prestacao,
  itens,
}: {
  prestacao: PrestacaoConta;
  itens: PrestacaoContaItem[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.cabecalho}>
          <View>
            <Text style={styles.marca}>
              <Text style={styles.marcaPoli}>POLI</Text>
              <Text style={styles.marcaBrilho}>BRILHO</Text>
            </Text>
            <Text style={styles.marcaSub}>ESTÉTICA AUTOMOTIVA</Text>
          </View>
          <View style={styles.cabecalhoDireita}>
            <Text style={styles.documentoTitulo}>PRESTAÇÃO DE CONTAS</Text>
            <Text
              style={styles.documentoSub}
              render={({ pageNumber, totalPages }) => `${prestacao.numero}  ·  ${pageNumber}/${totalPages}`}
              fixed
            />
          </View>
        </View>

        <View style={styles.corpo}>
          <Text style={styles.tituloRelatorio}>Relatório consolidado de serviços</Text>

          <View style={styles.caixaInfo}>
            <View style={[styles.infoCol, { flex: 1.15 }]}>
              <Text style={styles.infoLabel}>Cliente / Empresa</Text>
              <Text style={styles.infoValor}>{prestacao.cliente_nome}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>CNPJ / CPF</Text>
              <Text style={styles.infoValor}>{prestacao.documento || "Não informado"}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Contato</Text>
              <Text style={styles.infoValor}>{prestacao.telefone || "Não informado"}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>
              Período: {formatarData(prestacao.data_inicio)} a {formatarData(prestacao.data_fim)}
            </Text>
            <Text style={styles.metaItem}>Emissão: {formatarDataHora(prestacao.criado_em)}</Text>
            <Text style={styles.metaItem}>
              Vencimento: {prestacao.data_vencimento ? formatarData(prestacao.data_vencimento) : "—"}
            </Text>
          </View>

          <View style={styles.tabelaHeaderRow} fixed>
            <Text style={[styles.th, styles.colNumero]}>Nº</Text>
            <Text style={[styles.th, styles.colData]}>Data</Text>
            <Text style={[styles.th, styles.colVeiculo]}>Veículo / Tipo</Text>
            <Text style={[styles.th, styles.colPlaca]}>Placa</Text>
            <Text style={[styles.th, styles.colServico]}>Serviço</Text>
            <Text style={[styles.th, styles.colValor]}>Valor</Text>
          </View>
          {itens.map((item, i) => (
            <View
              key={item.id}
              style={[styles.tabelaLinha, i % 2 === 1 ? styles.linhaPar : undefined]}
              wrap={false}
            >
              <Text style={[styles.numeroTexto, styles.colNumero]}>{i + 1}</Text>
              <Text style={[styles.dataTexto, styles.colData]}>{formatarData(item.data)}</Text>
              <View style={styles.colVeiculo}>
                <Text style={styles.cellMain}>{item.veiculo_nome || "Sem veículo"}</Text>
                <Text style={styles.cellHelper}>
                  {item.veiculo_porte ? PORTE_LABELS[item.veiculo_porte] : "—"}
                </Text>
              </View>
              <Text style={[styles.placaTexto, styles.colPlaca]}>{item.veiculo_placa || "Sem placa"}</Text>
              <View style={styles.colServico}>
                <Text style={styles.cellMain}>{item.descricao}</Text>
                <Text style={styles.cellHelper}>{item.os_observacoes || "Sem observações"}</Text>
              </View>
              <Text style={[styles.valorTexto, styles.colValor]}>{formatarMoeda(item.valor)}</Text>
            </View>
          ))}

          <View style={styles.resumoRow}>
            <View>
              <Text style={styles.resumoTitulo}>
                {itens.length} serviço{itens.length === 1 ? "" : "s"} no documento
              </Text>
              <Text style={styles.resumoSub}>{prestacao.observacoes || "Sem observações adicionais."}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValor}>{formatarMoeda(prestacao.valor_total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rodape} fixed>
          <Text style={styles.rodapeTexto}>
            Documento de controle dos serviços realizados. Não substitui nota fiscal.
          </Text>
          <Text style={styles.rodapeTexto}>PoliBrilho Estética Automotiva</Text>
        </View>
      </Page>
    </Document>
  );
}
