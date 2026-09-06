import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SemAcessoPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <CardTitle>Sem acesso a esta tela</CardTitle>
        <CardDescription>
          Seu perfil não tem permissão para ver esta página. Se acha que deveria ter
          acesso, fale com um administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" render={<Link href="/" />} nativeButton={false}>
          Voltar ao início
        </Button>
      </CardContent>
    </Card>
  );
}
