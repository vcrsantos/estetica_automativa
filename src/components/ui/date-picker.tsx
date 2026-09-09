"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function paraIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function deIso(valor: string) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}
function inicioDoDia(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function adicionarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function inicioSemana(d: Date) {
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  return adicionarDias(inicioDoDia(d), diff);
}
function diasDaGradeDoMes(referencia: Date) {
  const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fimMes = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
  const inicio = inicioSemana(inicioMes);
  const fim = adicionarDias(inicioSemana(fimMes), 6);
  const dias: Date[] = [];
  for (let d = inicio; d <= fim; d = adicionarDias(d, 1)) dias.push(d);
  return dias;
}

/** Seletor de data com calendário próprio — em alguns aparelhos o `<input type="date">`
 * nativo exibe o valor por extenso (ex: "8 de set. de 2026"), formato que depende do
 * idioma/região do sistema e não pode ser forçado via código. Este componente sempre
 * mostra dd/mm/aaaa, independente do aparelho. `value`/`onChange` usam o mesmo formato
 * "aaaa-mm-dd" do input nativo, então substitui 1:1 nos formulários. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  disabled,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [aberto, setAberto] = React.useState(false);
  const selecionado = value ? deIso(value) : null;

  function selecionar(dia: Date) {
    onChange(paraIso(dia));
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3.5 py-1 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          !selecionado && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        {selecionado
          ? selecionado.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
          : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {aberto && (
          <CalendarioMes
            selecionado={selecionado}
            onSelecionar={selecionar}
            onLimpar={() => {
              onChange("");
              setAberto(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Só é montado enquanto o popover está aberto, então o mês inicial já nasce
 * correto (o selecionado, ou hoje) sem precisar de um efeito pra sincronizar. */
function CalendarioMes({
  selecionado,
  onSelecionar,
  onLimpar,
}: {
  selecionado: Date | null;
  onSelecionar: (dia: Date) => void;
  onLimpar: () => void;
}) {
  const hoje = inicioDoDia(new Date());
  const [referencia, setReferencia] = React.useState(() => selecionado ?? hoje);
  const dias = React.useMemo(() => diasDaGradeDoMes(referencia), [referencia]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={() => setReferencia((r) => new Date(r.getFullYear(), r.getMonth() - 1, 1))}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold capitalize">
          {MESES[referencia.getMonth()]} de {referencia.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => setReferencia((r) => new Date(r.getFullYear(), r.getMonth() + 1, 1))}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((dia) => {
          const foraDoMes = dia.getMonth() !== referencia.getMonth();
          const ehHoje = mesmoDia(dia, hoje);
          const ehSelecionado = selecionado !== null && mesmoDia(dia, selecionado);
          return (
            <button
              key={paraIso(dia)}
              type="button"
              onClick={() => onSelecionar(dia)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm transition-colors hover:bg-accent",
                foraDoMes && "text-muted-foreground/50",
                ehHoje && !ehSelecionado && "font-semibold text-primary",
                ehSelecionado && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {dia.getDate()}
            </button>
          );
        })}
      </div>

      {selecionado && (
        <button
          type="button"
          onClick={onLimpar}
          className="mt-2 w-full rounded-md py-1 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Limpar
        </button>
      )}
    </>
  );
}
