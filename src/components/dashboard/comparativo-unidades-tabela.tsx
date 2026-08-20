import type { DashboardInsights } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Comparativo entre unidades (seção 3.5/4.13 do escopo de melhorias) — uma linha por métrica, uma coluna por unidade. */
export function ComparativoUnidadesTabela({
  titulo,
  unidades,
}: {
  titulo: string;
  unidades: DashboardInsights["comparativo_unidades"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {unidades.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  {unidades.map((u) => (
                    <TableHead key={u.unidade_nome}>{u.unidade_nome}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">Faturamento</TableCell>
                  {unidades.map((u) => (
                    <TableCell key={u.unidade_nome} className="font-medium tabular-nums">
                      {formatarMoeda(u.faturamento)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Veículos</TableCell>
                  {unidades.map((u) => (
                    <TableCell key={u.unidade_nome} className="font-medium tabular-nums">
                      {u.qtd_servicos}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Ticket médio</TableCell>
                  {unidades.map((u) => (
                    <TableCell key={u.unidade_nome} className="font-medium tabular-nums">
                      {formatarMoeda(u.qtd_servicos > 0 ? u.faturamento / u.qtd_servicos : 0)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Taxa de retorno</TableCell>
                  {unidades.map((u) => (
                    <TableCell key={u.unidade_nome} className="font-medium tabular-nums">
                      {u.taxa_retorno_90d}%
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
