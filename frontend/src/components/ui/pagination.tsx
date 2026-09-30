import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Pagination({ page, totalPages, total, pageSize, onChange }: { page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
      <p>
        Showing <span className="font-medium text-slate-800">{from}–{to}</span> of <span className="font-medium text-slate-800">{total}</span>
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="px-1 tabular-nums">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}
