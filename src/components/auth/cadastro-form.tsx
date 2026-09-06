"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cadastroSchema, type CadastroFormValues } from "@/lib/validations/cadastro";
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

export function CadastroForm() {
  const router = useRouter();
  const [erro, setErro] = React.useState<string | null>(null);
  const [confirmarEmail, setConfirmarEmail] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroFormValues>({ resolver: zodResolver(cadastroSchema) });

  async function onSubmit(values: CadastroFormValues) {
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.senha,
      options: {
        data: {
          nome: values.nome,
          telefone: values.telefone || null,
        },
      },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Este e-mail já está cadastrado."
          : "Não foi possível concluir o cadastro. Tente novamente."
      );
      return;
    }

    // Se a confirmação de e-mail estiver ligada no Supabase Auth, o cadastro
    // é criado mas sem sessão ativa até a pessoa clicar no link do e-mail —
    // nesse caso não tem como ir pra /aguardando ainda.
    if (!data.session) {
      setConfirmarEmail(true);
      return;
    }

    router.replace("/aguardando");
    router.refresh();
  }

  if (confirmarEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirme seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação. Depois de confirmar, faça login
            normalmente — seu acesso ainda vai precisar ser liberado por um
            administrador.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>
            Seu acesso fica pendente até um administrador liberar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" autoComplete="name" {...register("nome")} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              {...register("telefone")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@polibrilho.com.br"
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
            {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
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
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Criar conta
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
