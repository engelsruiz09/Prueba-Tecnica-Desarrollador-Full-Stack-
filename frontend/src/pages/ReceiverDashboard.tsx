/**
 * Dashboard del receptor (Don Alex).
 *
 * Secciones:
 *   1. Stats cards: total recibido en GTQ, solicitudes pendientes
 *   2. Formulario de solicitud (en GTQ con preview en USD)
 *   3. Lista paginada con botones de confirmación
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { useTransactions } from "../hooks/useTransactions";
import { AppShell } from "../components/AppShell";
import { TransactionCard } from "../components/TransactionCard";
import { Pagination } from "../components/Pagination";
import { Wallet, Clock, ArrowDownLeft } from "lucide-react";

// ── Schema ─────────────────────────────────────────────────────────────────
const requestSchema = z.object({
  amount_gtq: z.coerce
    .number({ invalid_type_error: "Ingresa un monto válido" })
    .positive("El monto debe ser mayor a 0")
    .multipleOf(0.01, "Máximo 2 decimales"),
  note: z.string().min(3, "Describe el motivo (mín. 3 caracteres)").max(500),
});
type RequestForm = z.infer<typeof requestSchema>;

// ── Componente principal ────────────────────────────────────────────────────
export function ReceiverDashboard() {
  const { user } = useAuth();
  const [requestSuccess, setRequestSuccess] = useState(false);

  const {
    listQuery, rateQuery, requestMutation,
    page, setPage, invalidateList,
  } = useTransactions(8);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });

  const watchedAmount = watch("amount_gtq");

  // Preview de conversión GTQ → USD mientras escribe
  const previewUSD = watchedAmount && rateQuery.data
    ? (Number(watchedAmount) / Number(rateQuery.data.rate)).toFixed(2)
    : null;

  const onSubmit = async (data: RequestForm) => {
    try {
      await requestMutation.mutateAsync(data);
      reset();
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "Error al crear la solicitud");
    }
  };

  const transactions = listQuery.data?.items ?? [];

  const totalGTQ = transactions
    .filter(t => t.status === "confirmed")
    .reduce((sum, t) => sum + Number(t.amount_gtq), 0);

  const pendingCount = transactions.filter(t => t.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

        {/* ── Header ── */}
        <div>
          <h1 className="font-display text-3xl text-white">
            Hola, <span className="text-amber-gold">{user?.full_name.split(" ")[0]}</span>
          </h1>
          <p className="font-ui text-slate-subtle text-sm mt-1">
            Gestiona tus remesas y solicitudes
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Total recibido (confirmado)",
              value: new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(totalGTQ),
              icon: Wallet,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
            },
            {
              label: "Solicitudes pendientes",
              value: String(pendingCount),
              icon: Clock,
              color: "text-yellow-400",
              bg: "bg-yellow-500/10",
            },
          ].map((stat) => (
            <div key={stat.label} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <div className="font-mono font-semibold text-white text-lg">{stat.value}</div>
                <div className="font-ui text-xs text-slate-subtle">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Formulario de solicitud (2/5) ── */}
          <div className="lg:col-span-2 card space-y-5">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={16} className="text-amber-gold" />
              <h2 className="font-ui font-semibold text-white text-sm">Nueva solicitud</h2>
            </div>

            {requestSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30
                              text-emerald-400 text-xs font-ui">
                ✓ Solicitud enviada a Carlos
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
                  Monto (GTQ)
                </label>
                <input
                  {...register("amount_gtq")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="input-field font-mono"
                />
                {errors.amount_gtq && (
                  <p className="mt-1 text-xs text-red-400 font-ui">{errors.amount_gtq.message}</p>
                )}
                {/* Preview USD */}
                {previewUSD && (
                  <p className="mt-1.5 text-xs text-blue-400 font-mono">
                    ≈ ${Number(previewUSD).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
                  Motivo <span className="normal-case text-red-400/70 text-xs">*requerido</span>
                </label>
                <textarea
                  {...register("note")}
                  placeholder="Ej: Pago de electricidad del mes..."
                  rows={3}
                  className="input-field resize-none"
                />
                {errors.note && (
                  <p className="mt-1 text-xs text-red-400 font-ui">{errors.note.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || requestMutation.isPending}
                className="btn-primary"
              >
                {isSubmitting || requestMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-950/40 border-t-navy-950 rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar solicitud"
                )}
              </button>
            </form>
          </div>

          {/* ── Lista (3/5) ── */}
          <div className="lg:col-span-3 card space-y-4">
            <h2 className="font-ui font-semibold text-white text-sm">Mis transacciones</h2>

            {listQuery.isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-navy-700 rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {listQuery.data?.items.length === 0 && (
              <p className="text-slate-subtle text-sm font-ui py-4 text-center">
                Aún no hay transacciones
              </p>
            )}

            <div className="space-y-3">
              {listQuery.data?.items.map(t => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  currentUser={user!}
                  onUpdate={invalidateList}
                />
              ))}
            </div>

            {listQuery.data && (
              <Pagination
                page={page}
                totalPages={listQuery.data.total_pages}
                total={listQuery.data.total}
                pageSize={8}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}