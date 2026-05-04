import * as React from 'react';
import { Search, Check, X, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import type { RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullPropertyPicker } from '@repull/components/RepullPropertyPicker';
 *
 * // Single
 * <RepullPropertyPicker client={repull} value={listingId} onChange={setListingId} />
 *
 * // Multi
 * <RepullPropertyPicker client={repull} multi value={ids} onChange={setIds} />
 * ```
 */

interface ListingOption {
  id: string;
  title: string;
  address?: string;
}

type SinglePickerProps = {
  client: RepullClientLike;
  multi?: false;
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  className?: string;
};

type MultiPickerProps = {
  client: RepullClientLike;
  multi: true;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
};

export type RepullPropertyPickerProps = SinglePickerProps | MultiPickerProps;

export function RepullPropertyPicker(props: RepullPropertyPickerProps): React.ReactElement {
  const { client, placeholder, className } = props;
  const [open, setOpen] = React.useState<boolean>(false);
  const [query, setQuery] = React.useState<string>('');
  const [options, setOptions] = React.useState<ListingOption[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Load on first open (lazy).
  React.useEffect(() => {
    if (!open || loaded) return;
    const list = client.listings?.list;
    if (typeof list !== 'function') {
      setError('No listing access — check your SDK or workspace permissions.');
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    list({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const data = (res as { data?: Array<{ id: string | number; title?: string; address?: string }> }).data ?? [];
        setOptions(
          data.map((l) => ({
            id: String(l.id),
            title: l.title ?? `Listing ${l.id}`,
            address: l.address,
          })),
        );
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load listings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded, client]);

  // Click-outside.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter((o) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return o.title.toLowerCase().includes(q) || (o.address?.toLowerCase().includes(q) ?? false);
  });

  const isSelected = (id: string): boolean => {
    if (props.multi) return props.value.includes(id);
    return props.value === id;
  };

  const handleToggle = (id: string): void => {
    if (props.multi) {
      const next = isSelected(id) ? props.value.filter((v) => v !== id) : [...props.value, id];
      props.onChange(next);
    } else {
      props.onChange(props.value === id ? null : id);
      setOpen(false);
    }
  };

  const buttonLabel = props.multi
    ? props.value.length === 0
      ? placeholder ?? 'Select listings'
      : `${props.value.length} selected`
    : (() => {
        if (!props.value) return placeholder ?? 'Select a listing';
        const sel = options.find((o) => o.id === props.value);
        return sel?.title ?? props.value;
      })();

  return (
    <div ref={containerRef} className={cn('relative inline-block w-72', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="repull-property-picker-trigger"
        className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/80 dark:hover:bg-white/[0.04]"
      >
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          data-testid="repull-property-picker-menu"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#141414]"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-white/[0.06]">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              type="search"
              placeholder="Search listings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white/80 dark:placeholder:text-white/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={12} className="text-gray-400" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {loading && (
              <div className="space-y-1 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            )}
            {!loading && error && (
              <div className="px-3 py-3 text-xs text-red-500">{error}</div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-gray-500">
                {query ? 'No listings match this search.' : 'No listings yet — add one to get started.'}
              </div>
            )}
            {!loading && !error && filtered.map((opt) => {
              const selected = isSelected(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-testid="repull-property-picker-option"
                  onClick={() => handleToggle(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                    selected && 'bg-gray-50 dark:bg-white/[0.06]',
                  )}
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border', selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-white/20')}>
                    {selected && <Check size={10} />}
                  </span>
                  <span className="flex-1 truncate text-gray-800 dark:text-white/80">{opt.title}</span>
                  {opt.address && (
                    <span className="truncate text-xs text-gray-500 dark:text-white/50">{opt.address}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
