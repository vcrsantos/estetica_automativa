const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function grupoAteNoveNoveNove(n: number): string {
  if (n === 100) return "cem";

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 10) {
      partes.push(UNIDADES[resto]);
    } else if (resto < 20) {
      partes.push(DEZ_A_DEZENOVE[resto - 10]);
    } else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade > 0 ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }

  return partes.join(" e ");
}

/**
 * Regra usual do extenso monetário: "e" antes de um grupo simples (dezena,
 * unidade ou centena redonda), vírgula quando o grupo já é composto (ex.:
 * "duzentos e quarenta") — evita empilhar dois "e" seguidos na leitura.
 */
function separadorAntesDoUltimoGrupo(valorGrupo: number): string {
  const centenaRedonda = valorGrupo % 100 === 0;
  return valorGrupo < 100 || centenaRedonda ? " e " : ", ";
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const unidades = n % 1000;

  const grupos: { texto: string; valor: number }[] = [];

  if (milhoes > 0) {
    grupos.push({
      texto: milhoes === 1 ? "um milhão" : `${grupoAteNoveNoveNove(milhoes)} milhões`,
      valor: milhoes,
    });
  }
  if (milhares > 0) {
    grupos.push({
      texto: milhares === 1 ? "mil" : `${grupoAteNoveNoveNove(milhares)} mil`,
      valor: milhares,
    });
  }
  if (unidades > 0 || grupos.length === 0) {
    grupos.push({ texto: grupoAteNoveNoveNove(unidades), valor: unidades });
  }

  let resultado = grupos[0].texto;
  for (let i = 1; i < grupos.length; i++) {
    const separador = i === grupos.length - 1 ? separadorAntesDoUltimoGrupo(grupos[i].valor) : ", ";
    resultado += separador + grupos[i].texto;
  }

  return resultado;
}

/** "de" antes da moeda em múltiplos redondos de milhão (ex.: "dois milhões de reais"). */
function precisaDe(n: number): boolean {
  return n >= 1_000_000 && n % 1000 === 0;
}

/**
 * Valor em reais por extenso, em português. Gerar uma única vez no momento
 * da emissão do recibo e gravar o resultado — nunca recalcular na
 * renderização, senão uma troca nesta função muda o texto de documentos já
 * assinados.
 */
export function valorPorExtenso(valor: number): string {
  const centavosTotais = Math.round(valor * 100);
  const reaisInt = Math.floor(centavosTotais / 100);
  const centavosInt = centavosTotais % 100;

  const partes: string[] = [];

  if (reaisInt > 0) {
    const palavraReal = reaisInt === 1 ? "real" : "reais";
    const de = precisaDe(reaisInt) ? "de " : "";
    partes.push(`${inteiroPorExtenso(reaisInt)} ${de}${palavraReal}`);
  }

  if (centavosInt > 0) {
    const palavraCentavo = centavosInt === 1 ? "centavo" : "centavos";
    partes.push(`${inteiroPorExtenso(centavosInt)} ${palavraCentavo}`);
  }

  if (partes.length === 0) return "zero reais";

  return partes.join(" e ");
}
