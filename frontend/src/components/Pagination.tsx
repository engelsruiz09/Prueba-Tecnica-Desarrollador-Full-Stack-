/**
 * Controles de paginación reutilizables.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-navy-700">
      <span className="text-xs text-slate-subtle font-ui">
        {from}–{to} de {total} transacciones
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-slate-subtle hover:text-white hover:bg-navy-700
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Páginas */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-subtle text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-7 h-7 rounded-lg text-xs font-ui font-medium transition-colors ${
                  p === page
                    ? "bg-amber-gold text-navy-950"
                    : "text-slate-subtle hover:text-white hover:bg-navy-700"
                }`}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-slate-subtle hover:text-white hover:bg-navy-700
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}