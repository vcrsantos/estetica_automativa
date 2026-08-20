"use client";

import { CalendarRange } from "lucide-react";

import { PERIODO_OPCOES, type PeriodoSelecionado, type PeriodoId } from "@/lib/dashboard-periodo";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ITENS_SELECT = {
  ...Object.fromEntries(PERIODO_OPCOES.map((o) => [o.id, o.label])),
  personalizado: "Personalizado",
};

function formatarDataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Barra de contexto (seção 3.1 do escopo de melhorias do dashboard). */
export function SeletorPeriodo({
  periodoId,
  onPeriodoIdChange,
  personalizado,
  onPersonalizadoChange,
  periodo,
}: {
  periodoId: PeriodoId;
  onPeriodoIdChange: (id: PeriodoId) => void;
  personalizado: { inicio: string; fim: string };
  onPersonalizadoChange: (valores: { inicio: string; fim: string }) => void;
  /** Resultado de calcularPeriodo — usado só pra mostrar o intervalo calculado ao lado do seletor. */
  periodo: PeriodoSelecionado;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
      <Select
        items={ITENS_SELECT}
        value={periodoId}
        onValueChange={(v) => onPeriodoIdChange((v as PeriodoId) ?? "mes")}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODO_OPCOES.map((opcao) => (
            <SelectItem key={opcao.id} value={opcao.id}>
              {opcao.label}
            </SelectItem>
          ))}
          <SelectItem value="personalizado">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {periodoId !== "personalizado" && (
        <span className="text-xs text-muted-foreground">
          ({formatarDataCurta(periodo.inicio)} – {formatarDataCurta(periodo.fim)})
        </span>
      )}

      {periodoId === "personalizado" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="h-7 w-[8.5rem]"
            value={personalizado.inicio}
            onChange={(e) => onPersonalizadoChange({ ...personalizado, inicio: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            className="h-7 w-[8.5rem]"
            value={personalizado.fim}
            onChange={(e) => onPersonalizadoChange({ ...personalizado, fim: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
