import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

import type { Insight } from "@/lib/dashboard-insights-texto";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ESTILO: Record<Insight["tipo"], { icon: typeof Lightbulb; className: string }> = {
  positivo: { icon: TrendingUp, className: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  atencao: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  info: { icon: Lightbulb, className: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400" },
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lightbulb className="size-4" />
          Insights do negócio
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {insights.map((insight, i) => {
          const { icon: Icon, className } = ESTILO[insight.tipo];
          return (
            <div key={i} className="flex items-start gap-3">
              <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", className)}>
                <Icon className="size-3.5" />
              </div>
              <p className="pt-1 text-sm">{insight.texto}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
