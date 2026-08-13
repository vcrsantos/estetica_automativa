"use client";

import * as React from "react";
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

const schema = z.object({
  email: z.email("E-mail inválido"),
});

type Values = z.infer<typeof schema>;

export function RecuperarSenhaForm() {
  const [enviado, setEnviado] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });

    if (error) {
      setErro("Não foi possível enviar o e-mail de recuperação.");
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifique seu e-mail</CardTitle>
          <CardDescription>
            Se o e-mail informado estiver cadastrado, você receberá um link para
            redefinir sua senha em instantes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe o e-mail cadastrado para receber o link de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@polibrilho.com.br"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
