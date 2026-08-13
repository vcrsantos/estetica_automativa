"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z
  .object({
    senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

type Values = z.infer<typeof schema>;

export function AtualizarSenhaForm() {
  const router = useRouter();
  const [erro, setErro] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.senha });

    if (error) {
      setErro("Não foi possível atualizar a senha. Peça um novo link de recuperação.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Definir nova senha</CardTitle>
          <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
            {errors.senha && (
              <p className="text-sm text-destructive">{errors.senha.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              autoComplete="new-password"
              {...register("confirmarSenha")}
            />
            {errors.confirmarSenha && (
              <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
            )}
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
