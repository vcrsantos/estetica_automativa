import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  email: z.email("E-mail inválido").optional().or(z.literal("")),
  documento: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  origem: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  etiqueta: z.enum(["comum", "frota", "vip"]),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

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
  pequeno: "Pequeno (hatch)",
  medio: "Médio (sedan)",
  grande: "Grande (SUV/caminhonete)",
  moto: "Moto",
};

export const ETIQUETA_LABELS: Record<ClienteFormValues["etiqueta"], string> = {
  comum: "Comum",
  frota: "Frota/Empresa",
  vip: "VIP",
};
