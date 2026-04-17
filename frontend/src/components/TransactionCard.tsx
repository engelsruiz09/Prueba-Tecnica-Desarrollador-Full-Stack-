/**
 * Card de una transacción individual.
 * Muestra montos, tipo, estado y acciones disponibles según el rol.
 */
import type { Transaction, User } from "../types";
import { StatusBadge } from "./StatusBadge";
import { transactionsApi } from "../api/transactions";
import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle } from "lucide-react";

interface Props {
  transaction: Transaction;
  currentUser: User;
  onUpdate: () => void; // callback para refrescar la lista tras una acción
}

export function TransactionCard({ transaction, currentUser, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  const isReceiver = currentUser.id === transaction.receiver_id;
  const isSend = transaction.type === "send";

  const handleStatus = async (status: "confirmed" | "cancelled") => {
    setLoading(true);
    try {
      await transactionsApi.updateStatus(transaction.id, status);
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  // Formateo de montos con separadores
  const fmtUSD = (v: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));
  const fmtGTQ = (v: string) =>
    new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(Number(v));
  const fmtDate = (v: string) =>
    new Date(v).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="card hover:border-navy-600 transition-colors duration-200 group">
      <div className="flex items-start justify-between gap-4">
        {/* Ícono + info principal */}
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isSend ? "bg-blue-500/15 text-blue-400" : "bg-amber-gold/15 text-amber-gold"
          }`}>
            {isSend
              ? <ArrowUpRight size={20} />
              : <ArrowDownLeft size={20} />
            }
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-ui font-semibold text-white text-sm">
                {isSend ? "Envío" : "Solicitud"}
              </span>
              <StatusBadge status={transaction.status} />
            </div>

            {transaction.note && (
              <p className="text-xs text-slate-subtle font-ui mt-1 max-w-xs">
                {transaction.note}
              </p>
            )}

            <p className="text-xs text-navy-600 font-ui mt-1">
              {fmtDate(transaction.created_at)} · Tasa: {Number(transaction.exchange_rate).toFixed(4)}
            </p>
          </div>
        </div>

        {/* Montos */}
        <div className="text-right flex-shrink-0">
          <div className="font-mono font-semibold text-white text-sm">
            {fmtUSD(transaction.amount_usd)}
          </div>
          <div className="font-mono text-xs text-amber-gold mt-0.5">
            {fmtGTQ(transaction.amount_gtq)}
          </div>
        </div>
      </div>

      {/* Acciones: solo si está pendiente y el usuario tiene permiso */}
      {transaction.status === "pending" && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-navy-700">
          {/* Solo el receptor confirma */}
          {isReceiver && (
            <button
              onClick={() => handleStatus("confirmed")}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-ui font-medium text-emerald-400
                         hover:text-emerald-300 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              Confirmar recepción
            </button>
          )}
          {/* Cualquiera puede cancelar */}
          <button
            onClick={() => handleStatus("cancelled")}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-ui font-medium text-red-400
                       hover:text-red-300 transition-colors disabled:opacity-50 ml-auto"
          >
            <XCircle size={14} />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}