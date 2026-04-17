/**
 * Badge visual para el estado de una transacción.
 * Usa las clases utilitarias definidas en index.css.
 */
import type { TransactionStatus } from "../types";

const labels: Record<TransactionStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const classes: Record<TransactionStatus, string> = {
  pending: "badge-pending",
  confirmed: "badge-confirmed",
  cancelled: "badge-cancelled",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-ui font-medium border ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}