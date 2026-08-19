import { Car } from "lucide-react";

import type { DashboardResumo } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatarMedia(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function VeiculosResumoCard({ resumo }: { resumo: DashboardResumo }) {
  const hoje = new Date();
  const diasDecorridosMes = hoje.getDate();
  const mediaSemana = resumo.semana.qtd_servicos / 7;
  const mediaMes = resumo.mes.qtd_servicos / diasDecorridosMes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Car className="size-4" />
          Veículos atendidos
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.hoje.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground">Hoje</span>
        </div>
        <div className="flex flex-col gap-0.5 border-x border-border">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.semana.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground">Semana</span>
          <span className="text-xs text-muted-foreground">média {formatarMedia(mediaSemana)}/dia</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-2xl font-bold tabular-nums">{resumo.mes.qtd_servicos}</span>
          <span className="text-xs text-muted-foreground">Mês</span>
          <span className="text-xs text-muted-foreground">média {formatarMedia(mediaMes)}/dia</span>
        </div>
      </CardContent>
    </Card>
  );
}
