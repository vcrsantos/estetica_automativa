import { STATUS_PAGAMENTO_LABELS } from "@/lib/validations/ordem-servico";
import type { StatusPagamento } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const VARIANT: Record<StatusPagamento, "success" | "warning" | "info"> = {
  pago: "success",
  parcial: "warning",
  pendente: "warning",
};

export function StatusPagamentoBadge({ status }: { status: StatusPagamento }) {
  return <Badge variant={VARIANT[status]}>{STATUS_PAGAMENTO_LABELS[status]}</Badge>;
}
