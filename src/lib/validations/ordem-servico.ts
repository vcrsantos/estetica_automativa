import { z } from "zod";

export const STATUS_OS_LABELS = {
  agendado: "Agendado",
  em_execucao: "Em execução",
  finalizado: "Finalizado",
  entregue: "Entregue",
  cancelado: "Cancelado",
} as const;

export const FORMA_PAGAMENTO_LABELS = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  debito: "Débito",
  credito: "Crédito",
  a_prazo: "A prazo",
} as const;

export const STATUS_PAGAMENTO_LABELS = {
  pago: "Pago",
  pendente: "Pendente",
  parcial: "Parcial",
} as const;

export const itemOsSchema = z.object({
  servico_id: z.string().nullable(),
  descricao: z.string().min(1),
  valor_tabela: z.number().min(0),
  valor_praticado: z.number().min(0),
});

export type ItemOsFormValues = z.infer<typeof itemOsSchema>;

export const novaOsSchema = z.object({
  unidade_id: z.string().min(1, "Selecione a unidade"),
  cliente_id: z.string().min(1, "Selecione o cliente"),
  veiculo_id: z.string().nullable(),
  executor_ids: z.array(z.string()),
  itens: z.array(itemOsSchema).min(1, "Adicione pelo menos um serviço"),
  desconto: z.string().optional().or(z.literal("")),
  forma_pagamento: z
    .enum(["dinheiro", "pix", "debito", "credito", "a_prazo"])
    .nullable(),
  status_pagamento: z.enum(["pago", "pendente", "parcial"]),
  observacoes: z.string().optional().or(z.literal("")),
});

export type NovaOsFormValues = z.infer<typeof novaOsSchema>;
