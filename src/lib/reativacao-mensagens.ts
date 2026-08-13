export type EstiloMensagem = "leve" | "proximo" | "saudade" | "exclusiva";

export const ESTILOS_MENSAGEM: { id: EstiloMensagem; label: string }[] = [
  { id: "leve", label: "Leve" },
  { id: "proximo", label: "Próximo" },
  { id: "saudade", label: "Sentimos sua falta" },
  { id: "exclusiva", label: "Exclusiva" },
];

/** WhatsApp usa *um asterisco* para negrito, não **dois**. */
export function montarMensagemReativacao(estilo: EstiloMensagem, primeiroNome: string): string {
  switch (estilo) {
    case "leve":
      return `Olá, ${primeiroNome}! 👋✨\nPassando pra lembrar que já faz alguns dias desde o último cuidado do seu veículo. 🚗\n\nQue tal dar aquela renovada e deixar tudo limpo, cuidado e com brilho novamente? 😍\n\nA *Polibrilho* está pronta pra cuidar dele! 💛\nQuer que eu veja um horário disponível pra você?`;
    case "proximo":
      return `Olá, ${primeiroNome}! Tudo bem? 😊\n\nSeu veículo já está sentindo saudade da *Polibrilho*! 😂✨\n\nJá passou um tempinho desde o último atendimento e esse pode ser um bom momento para renovar aquele cuidado, limpeza e brilho. 🚗✨\n\nSe quiser, me chama aqui que já verificamos um horário pra você. 💛`;
    case "saudade":
      return `Olá, ${primeiroNome}! 😊✨\n\n*Sentimos sua falta por aqui!* 💛\n\nJá faz um tempinho desde a última visita do seu veículo à *Polibrilho*, e talvez já esteja na hora de renovar aquele cuidado. 🚗✨\n\nQue tal deixar ele limpinho, bem cuidado e com aquele brilho que faz diferença?\n\nMe chama por aqui que verifico um horário pra você. 😉`;
    case "exclusiva":
      return `Oi, ${primeiroNome}! 👋💛\nPassando porque percebemos que já faz alguns dias desde o último cuidado do seu veículo por aqui.\n\nE cliente da *Polibrilho* a gente não esquece! ✨\n\nSe estiver na hora de renovar a limpeza e o brilho, chama a gente que encontramos um horário pra cuidar dele novamente. 🚗✨\n\n*Seu carro merece esse cuidado.*`;
  }
}
