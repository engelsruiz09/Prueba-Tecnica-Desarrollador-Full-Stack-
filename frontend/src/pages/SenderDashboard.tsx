/**
 * Dashboard del emisor (Carlos).
 *
 * Secciones:
 *   1. Stats cards: total enviado, tasa actual, transacciones pendientes
 *   2. Gráfico de tendencia Recharts con toggle USD/GTQ
 *   3. Formulario de envío
 *   4. Lista paginada de transacciones
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { useTransactions } from "../hooks/useTransactions";
import { AppShell } from "../components/AppShell";
import { TransactionCard } from "../components/TransactionCard";
import { Pagination } from "../components/Pagination";
import { TrendingUp, DollarSign, Clock, Send } from "lucide-react";

// ── Schema ─────────────────────────────────────────────────────────────────
const sendSchema = z.object({
  amount_usd: z.coerce
    .number({ invalid_type_error: "Ingresa un monto válido" })
    .positive("El monto debe ser mayor a 0")
    .multipleOf(0.01, "Máximo 2 decimales"),
  note: z.string().max(500).optional(),
});
type SendForm = z.infer<typeof sendSchema>;

// ── Tooltip personalizado del gráfico ──────────────────────────────────────
function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const formatted = currency === "USD"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(value);

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-subtle font-ui mb-1">{label}</p>
      <p className="font-mono font-semibold text-amber-gold text-sm">{formatted}</p>
      <p className="text-xs text-slate-subtle font-ui mt-1">
        {currency === "USD" ? "en dólares" : "en quetzales"}
      </p>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export function SenderDashboard() {
  const { user } = useAuth();
  const [chartCurrency, setChartCurrency] = useState<"USD" | "GTQ">("USD");
  const [sendSuccess, setSendSuccess] = useState(false);

  const {
    listQuery, rateQuery, sendMutation,
    page, setPage, invalidateList
  } = useTransactions(8);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
  });

  const watchedAmount = watch("amount_usd");

  // Calcular preview de conversión mientras el usuario escribe
  const previewGTQ = watchedAmount && rateQuery.data
    ? (Number(watchedAmount) * Number(rateQuery.data.rate)).toFixed(2)
    : null;

  const onSubmit = async (data: SendForm) => {
    try {
      await sendMutation.mutateAsync(data);
      reset();
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "Error al registrar el envío");
    }
  };

  // Preparar datos del gráfico desde el historial
  const transactions = listQuery.data?.items ?? [];

  const chartData = transactions
    .filter(t => t.type === "send")
    .slice()
    .reverse()
    .map(t => ({
      date: new Date(t.created_at).toLocaleDateString("es-GT", { day: "2-digit", month: "short" }),
      USD: Number(t.amount_usd),
      GTQ: Number(t.amount_gtq),
    }));

  // Stats calculadas
  const totalUSD = transactions
    .filter(t => t.type === "send" && t.status !== "cancelled")
    .reduce((sum, t) => sum + Number(t.amount_usd), 0);

  const pendingCount = transactions.filter(t => t.status === "pending").length;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">

        {/* ── Header ── */}
        <div>
          <h1 className="font-display text-3xl text-white">
            Hola, <span className="text-amber-gold">{user?.full_name.split(" ")[0]}</span>
          </h1>
          <p className="font-ui text-slate-subtle text-sm mt-1">
            Resumen de tus remesas a Guatemala
          </p>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total enviado",
              value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalUSD),
              icon: DollarSign,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
            {
              label: "Tasa actual",
              value: rateQuery.data ? `Q ${Number(rateQuery.data.rate).toFixed(4)}` : "—",
              icon: TrendingUp,
              color: "text-amber-gold",
              bg: "bg-amber-gold/10",
            },
            {
              label: "Pendientes",
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

          {/* ── Gráfico (3/5) ── */}
          <div className="lg:col-span-3 card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui font-semibold text-white text-sm">Tendencia de envíos</h2>
              {/* Toggle USD / GTQ */}
              <div className="flex rounded-lg bg-navy-700 p-0.5 text-xs">
                {(["USD", "GTQ"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setChartCurrency(c)}
                    className={`px-3 py-1 rounded-md font-ui font-medium transition-all duration-150 ${
                      chartCurrency === c
                        ? "bg-amber-gold text-navy-950"
                        : "text-slate-subtle hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-subtle text-sm font-ui">
                Aún no hay envíos para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2847" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#8492a6", fontSize: 11, fontFamily: "DM Sans" }}
                    axisLine={{ stroke: "#1a2847" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#8492a6", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip currency={chartCurrency} />} />
                  <Line
                    type="monotone"
                    dataKey={chartCurrency}
                    stroke="#d4a853"
                    strokeWidth={2}
                    dot={{ fill: "#d4a853", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#e8c47a", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Formulario de envío (2/5) ── */}
          <div className="lg:col-span-2 card space-y-5">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-amber-gold" />
              <h2 className="font-ui font-semibold text-white text-sm">Registrar envío</h2>
            </div>

            {sendSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30
                              text-emerald-400 text-xs font-ui">
                ✓ Envío registrado correctamente
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
                  Monto (USD)
                </label>
                <input
                  {...register("amount_usd")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="input-field font-mono"
                />
                {errors.amount_usd && (
                  <p className="mt-1 text-xs text-red-400 font-ui">{errors.amount_usd.message}</p>
                )}
                {/* Preview de conversión en tiempo real */}
                {previewGTQ && (
                  <p className="mt-1.5 text-xs text-amber-gold font-mono">
                    ≈ Q {Number(previewGTQ).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
                  Nota <span className="normal-case text-navy-600">(opcional)</span>
                </label>
                <textarea
                  {...register("note")}
                  placeholder="Gasto del mes..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || sendMutation.isPending}
                className="btn-primary"
              >
                {isSubmitting || sendMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-950/40 border-t-navy-950 rounded-full animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  "Registrar envío"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Lista de transacciones ── */}
        <div className="card space-y-4">
          <h2 className="font-ui font-semibold text-white text-sm">Historial reciente</h2>

          {listQuery.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-navy-700 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {listQuery.isError && (
            <p className="text-red-400 text-sm font-ui">Error al cargar el historial</p>
          )}

          {listQuery.data?.items.length === 0 && (
            <p className="text-slate-subtle text-sm font-ui py-4 text-center">
              Aún no hay transacciones registradas
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
    </AppShell>
  );
}