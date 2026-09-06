import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { SairButton } from "@/components/auth/sair-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Não usa getCurrentUsuario() de propósito: essa função redireciona pra cá
 * quando status = 'pendente', então chamá-la aqui criaria um loop de
 * redirecionamento nesta própria página.
 */
export default async function AguardandoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("status")
    .eq("id", user.id)
    .single();

  if (usuario?.status === "ativo") {
    redirect("/");
  }
  if (usuario?.status === "inativo") {
    redirect("/login");
  }

  return (
    <AuthCardShell>
      <Card>
        <CardHeader className="items-center text-center">
          <Clock className="size-8 text-muted-foreground" />
          <CardTitle>Acesso em análise</CardTitle>
          <CardDescription>
            Seu cadastro foi recebido. Assim que um administrador liberar seu acesso,
            você poderá entrar normalmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SairButton />
        </CardContent>
      </Card>
    </AuthCardShell>
  );
}
