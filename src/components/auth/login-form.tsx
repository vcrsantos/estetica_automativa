"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const EMAIL_LEMBRADO_KEY = "polibrilho:email-lembrado";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Digite sua senha."),
  lembrar: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [erro, setErro] = React.useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { lembrar: false },
  });

  React.useEffect(() => {
    const lembrado = window.localStorage.getItem(EMAIL_LEMBRADO_KEY);
    if (lembrado) {
      setValue("email", lembrado);
      setValue("lembrar", true);
    }
  }, [setValue]);

  async function onSubmit(values: LoginValues) {
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }

    if (values.lembrar) {
      window.localStorage.setItem(EMAIL_LEMBRADO_KEY, values.email);
    } else {
      window.localStorage.removeItem(EMAIL_LEMBRADO_KEY);
    }

    router.replace(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <Card className="gap-0 rounded-2xl border-transparent bg-transparent py-0 shadow-none md:border-border md:bg-card md:shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
      <CardContent className="flex flex-col gap-6 px-0 py-0 md:px-10 md:py-10">
        <div className="flex flex-col items-center gap-1 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo estático em public/, sem necessidade do pipeline de otimização de imagem */}
          <img src="/logo-polibrilho.png" alt="Polibrilho" className="h-24 w-auto" />
        </div>
        <div className="flex flex-col gap-1 text-center md:text-left">
          <h1 className="font-heading text-[32px] leading-tight font-bold text-foreground sm:text-[36px] md:text-[40px]">
            Bem-vindo
          </h1>
          <p className="text-[17px] text-muted-foreground">Acesse o sistema de gestão interna</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[15px] font-semibold">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-erro" : undefined}
                className="h-14 rounded-xl pl-11 text-base"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p id="email-erro" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha" className="text-[15px] font-semibold">
                Senha
              </Label>
              <Link
                href="/recuperar-senha"
                className="text-sm font-medium text-[#a67f00] underline-offset-4 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha"
                type={senhaVisivel ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                aria-invalid={!!errors.senha}
                aria-describedby={errors.senha ? "senha-erro" : undefined}
                className="h-14 rounded-xl pr-11 pl-11 text-base"
                {...register("senha")}
              />
              <button
                type="button"
                onClick={() => setSenhaVisivel((v) => !v)}
                aria-label={senhaVisivel ? "Ocultar senha" : "Exibir senha"}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {senhaVisivel ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.senha && (
              <p id="senha-erro" className="text-sm text-destructive">
                {errors.senha.message}
              </p>
            )}
          </div>

          <label className="flex w-fit items-center gap-2 text-sm text-foreground select-none">
            <input
              type="checkbox"
              className={cn(
                "size-4 shrink-0 rounded border border-input bg-transparent accent-primary",
                "focus-visible:ring-3 focus-visible:ring-ring/50"
              )}
              {...register("lembrar")}
            />
            Lembrar de mim
          </label>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-[58px] w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-none hover:bg-primary/90 hover:brightness-100 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="size-5" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem acesso?{" "}
            <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
