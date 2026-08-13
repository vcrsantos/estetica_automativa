/** Monta um link wa.me a partir de um telefone brasileiro em qualquer formato. */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}
