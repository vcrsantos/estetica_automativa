import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  telefone: z.string().optional().or(z.literal("")),
  email: z.email("E-mail inválido").optional().or(z.literal("")),
  documento: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  origem: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

/**
 * Lista fechada de origem (seção 4.10 do escopo de melhorias do dashboard)
 * — precisa ser fechada pra dar pra analisar receita por canal de forma
 * confiável. O schema continua aceitando string livre pra não quebrar
 * cadastros antigos com texto digitado à mão.
 */
export const ORIGEM_OPCOES = ["Instagram", "Indicação", "Google", "Passante", "WhatsApp", "Outro"] as const;

export const veiculoSchema = z.object({
  placa: z.string().optional().or(z.literal("")),
  marca: z.string().optional().or(z.literal("")),
  modelo: z.string().optional().or(z.literal("")),
  ano: z.string().optional().or(z.literal("")),
  cor: z.string().optional().or(z.literal("")),
  porte: z.enum(["pequeno", "medio", "grande", "moto"]),
  observacoes: z.string().optional().or(z.literal("")),
});

export type VeiculoFormValues = z.infer<typeof veiculoSchema>;

export const PORTE_LABELS: Record<VeiculoFormValues["porte"], string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  moto: "Moto",
};
