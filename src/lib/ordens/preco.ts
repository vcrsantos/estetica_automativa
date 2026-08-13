import type { Preco, PorteVeiculo } from "@/types/database";

/** Acha o preço de referência de um serviço para a unidade e o porte (ou "sem porte"). */
export function encontrarPreco(
  precos: Preco[],
  servicoId: string,
  unidadeId: string,
  porte: PorteVeiculo | null
): number {
  const preco = precos.find(
    (p) => p.servico_id === servicoId && p.unidade_id === unidadeId && p.porte === porte
  );
  return preco?.valor ?? 0;
}
