import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NovosXRecorrentesCard({ novos, recorrentes }: { novos: number; recorrentes: number }) {
  const total = novos + recorrentes;
  const pctNovos = total > 0 ? (novos / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Clientes novos x recorrentes (este mês)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem clientes atendidos este mês.</p>
        ) : (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-chart-1" style={{ width: `${pctNovos}%` }} />
              <div className="h-full bg-chart-4" style={{ width: `${100 - pctNovos}%` }} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-1" />
                {novos} novo{novos === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-chart-4" />
                {recorrentes} recorrente{recorrentes === 1 ? "" : "s"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
