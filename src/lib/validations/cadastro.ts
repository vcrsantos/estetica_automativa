import { z } from "zod";

export const cadastroSchema = z
  .object({
    nome: z.string().min(2, "Informe o nome completo"),
    telefone: z.string().optional().or(z.literal("")),
    email: z.email("E-mail inválido"),
    senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export type CadastroFormValues = z.infer<typeof cadastroSchema>;
