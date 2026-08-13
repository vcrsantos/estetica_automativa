import { z } from "zod";

export const servicoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do serviço"),
  descricao: z.string().optional().or(z.literal("")),
  categoria: z.string().optional().or(z.literal("")),
  exige_veiculo: z.boolean(),
  duracao_min: z.string().optional().or(z.literal("")),
  intervalo_retorno_dias: z.string().optional().or(z.literal("")),
  ativo: z.boolean(),
});

export type ServicoFormValues = z.infer<typeof servicoSchema>;
