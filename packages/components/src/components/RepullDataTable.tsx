import * as React from 'react';
import { Download, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import { downloadCSV, toCSV } from '../utils/csv.js';
import { resolveListMethod, type DataTableResource, type RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullDataTable } from '@repull/components/RepullDataTable';
 *
 * <RepullDataTable
 *   client={repull}
 *   resource="reservations"
 *   pageSize={50}
 *   filters={{ status: 'confirmed' }}
 * />
 * ```
 */

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface RepullDataTableProps {
  client: RepullClientLike;
  resource: DataTableResource;
  columns?: DataTableColumn[];
  filters?: Record<string, unknown>;
  pageSize?: number;
  className?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}

const DEFAULT_COLUMNS: Record<DataTableResource, DataTableColumn[]> = {
  reservations: [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'startDate', header: 'Check-in', sortable: true },
    { key: 'endDate', header: 'Check-out', sortable: true },
    { key: 'totalAmount', header: 'Total', sortable: true },
  ],
  listings: [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'address', header: 'Address' },
    { key: 'status', header: 'Status', sortable: true },
  ],
  guests: [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
  ],
  payments: [
    { key: 'id', header: 'ID' },
    { key: 'amount', header: 'Amount', sortable: true },
    { key: 'currency', header: 'Currency' },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'createdAt', header: 'Date', sortable: true },
  ],
  tasks: [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'assignee', header: 'Assignee' },
    { key: 'dueAt', header: 'Due' },
  ],
};

const EMPTY_STATE: Record<DataTableResource, string> = {
  reservations: 'No reservations match these filters yet. New bookings will appear here automatically.',
  listings: 'No listings to show. Connect a channel or import a property to get started.',
  guests: 'No guests yet. Once a reservation is created, the guest will show up here.',
  payments: 'No payments yet. Connect Stripe and process a booking to populate this list.',
  tasks: 'No tasks. Tasks created by your team or by Vanio AI will appear here.',
};

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

function FilterChip({ label, value, onRemove }: FilterChipProps): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/[0.08] dark:text-white/80">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-1 rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-white/[0.12]"
      >
        <X size={10} />
      </button>
    </span>
  );
}

export function RepullDataTable({
  client,
  resource,
  columns,
  filters,
  pageSize = 25,
  className,
  onRowClick,
}: RepullDataTableProps): React.ReactElement {
  const cols = columns ?? DEFAULT_COLUMNS[resource];
  const listMethod = React.useMemo(() => resolveListMethod(client, resource), [client, resource]);

  const [rows, setRows] = React.useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState<number>(0);
  const [hasMore, setHasMore] = React.useState<boolean>(false);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<Record<string, unknown>>(filters ?? {});
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  React.useEffect(() => {
    setActiveFilters(filters ?? {});
    setPage(0);
    setCursor(null);
  }, [filters]);

  React.useEffect(() => {
    if (!listMethod) {
      setLoading(false);
      setError(`This SDK build does not expose ${resource}.list — upgrade @repull/sdk.`);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const query: Record<string, unknown> = { ...activeFilters, limit: pageSize };
    if (cursor) query.cursor = cursor;
    listMethod(query)
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setRows(data as Record<string, unknown>[]);
        setHasMore(Boolean(res?.pagination?.hasMore));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listMethod, activeFilters, pageSize, cursor, resource]);

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const dir = sort.dir === 'asc' ? 1 : -1;
      return av > bv ? dir : -dir;
    });
    return sorted;
  }, [rows, sort]);

  const handleExport = (): void => {
    const csv = toCSV(sortedRows, cols.map((c) => c.key));
    downloadCSV(`${resource}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleRemoveFilter = (key: string): void => {
    const next = { ...activeFilters };
    delete next[key];
    setActiveFilters(next);
    setCursor(null);
    setPage(0);
  };

  const toggleSort = (key: string): void => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const filterEntries = Object.entries(activeFilters).filter(([, v]) => v !== undefined && v !== '');

  return (
    <div
      data-testid="repull-data-table"
      className={cn(
        'rounded-xl border border-gray-200 bg-white text-sm dark:border-white/[0.08] dark:bg-white/[0.02]',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-white/[0.08]">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {filterEntries.length === 0 ? (
            <span className="text-xs text-gray-500">No filters</span>
          ) : (
            filterEntries.map(([k, v]) => (
              <FilterChip
                key={k}
                label={k}
                value={String(v)}
                onRemove={() => handleRemoveFilter(k)}
              />
            ))
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || rows.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.04]"
          aria-label="Export CSV"
        >
          <Download size={12} />
          CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" data-testid="repull-data-table-grid">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60',
                    col.sortable && 'cursor-pointer select-none',
                  )}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {cols.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-3 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            )}

            {!loading && error && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-6 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && sortedRows.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-10 text-center text-sm text-gray-500">
                  {EMPTY_STATE[resource]}
                </td>
              </tr>
            )}

            {!loading && !error && sortedRows.map((row, idx) => (
              <tr
                key={String(row.id ?? idx)}
                data-testid="repull-data-table-row"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-gray-100 last:border-0 dark:border-white/[0.04]',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                )}
              >
                {cols.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-gray-800 dark:text-white/80">
                    {col.render ? col.render(row) : (row[col.key] === null || row[col.key] === undefined ? '—' : String(row[col.key]))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-600 dark:border-white/[0.08] dark:text-white/60">
        <span>{rows.length} row{rows.length === 1 ? '' : 's'}{page > 0 && ` · page ${page + 1}`}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage((p) => Math.max(0, p - 1));
              setCursor(null);
            }}
            disabled={page === 0 || loading}
            className="rounded border border-gray-200 px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => {
              setPage((p) => p + 1);
            }}
            disabled={!hasMore || loading}
            className="rounded border border-gray-200 px-2 py-0.5 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:hover:bg-white/[0.04]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
