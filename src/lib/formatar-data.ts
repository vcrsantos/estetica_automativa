/** `toLocaleDateString("pt-BR")` sem opções varia entre navegadores/aparelhos
 * (alguns caem num formato por extenso, ex: "8 de set. de 2026"). Forçar
 * day/month/year numéricos garante sempre "08/09/2026". */
export function formatarData(data: string | Date, opcoes?: { timeZone?: string }) {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", ...opcoes });
}
