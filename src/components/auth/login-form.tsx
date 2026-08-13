"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const loginSchema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [erro, setErro] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.senha,
    });

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.replace(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse com seu e-mail e senha cadastrados.</CardDescription>
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-sm text-destructive">{errors.senha.message}</p>
            )}
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
