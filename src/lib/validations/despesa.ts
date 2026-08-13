import { z } from "zod";

export const CATEGORIAS_DESPESA_SUGERIDAS = [
  "Produtos",
  "Água",
  "Energia",
  "Salários",
  "Aluguel",
  "Manutenção",
  "Outros",
] as const;

export const novaDespesaSchema = z.object({
  unidade_id: z.string().min(1, "Selecione a unidade"),
  categoria: z.string().min(1, "Informe a categoria"),
  descricao: z.string().optional().or(z.literal("")),
  valor: z.string().min(1, "Informe o valor"),
  data: z.string().min(1, "Informe a data"),
});

export type NovaDespesaFormValues = z.infer<typeof novaDespesaSchema>;
