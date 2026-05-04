import * as React from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import type { RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullPriceCell } from '@repull/components/RepullPriceCell';
 *
 * <RepullPriceCell
 *   client={repull}
 *   listingId="L-1"
 *   date="2026-05-12"
 * />
 * ```
 */

export interface RepullPriceCellProps {
  client: RepullClientLike;
  listingId: string | number;
  date: string; // YYYY-MM-DD
  className?: string;
  currency?: string;
}

interface PricingFactor {
  factor: string;
  impact: number;
  description?: string;
}

interface PricingRecLite {
  date: string;
  recommendedPrice?: number;
  currentPrice?: number;
  compMedian?: number;
  factors?: PricingFactor[];
  status?: string;
}

function formatMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || amount === null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? '$'}${amount.toFixed(0)}`;
  }
}

/** Map comp delta to a heatmap color class. Negative = under-priced (cool), positive = over (warm). */
function compDeltaClasses(delta: number | null): string {
  if (delta === null) return 'bg-gray-50 text-gray-700 dark:bg-white/[0.03] dark:text-white/80';
  if (delta <= -0.15) return 'bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200';
  if (delta <= -0.05) return 'bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200';
  if (delta < 0.05) return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200';
  if (delta < 0.15) return 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200';
  return 'bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200';
}

export function RepullPriceCell({
  client,
  listingId,
  date,
  className,
  currency,
}: RepullPriceCellProps): React.ReactElement {
  const [rec, setRec] = React.useState<PricingRecLite | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const get = client.listings?.pricing?.get;
    if (typeof get !== 'function') {
      setError('No pricing access — upgrade to v2-xgboost.');
      setLoading(false);
      return;
    }

    get(listingId, { startDate: date, endDate: date })
      .then((res) => {
        if (cancelled) return;
        const data = (res as { data?: PricingRecLite[] }).data ?? [];
        const match = data.find((d) => d.date === date) ?? data[0] ?? null;
        setRec(match);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load price.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, listingId, date]);

  if (loading) {
    return (
      <div
        data-testid="repull-price-cell"
        className={cn('inline-block rounded-md p-1', className)}
      >
        <Skeleton className="h-7 w-16" />
      </div>
    );
  }

  if (error || !rec) {
    return (
      <span
        data-testid="repull-price-cell"
        className={cn(
          'inline-flex items-center justify-center rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:bg-white/[0.03] dark:text-white/50',
          className,
        )}
        title={error ?? 'No recommendation'}
      >
        —
      </span>
    );
  }

  const delta =
    typeof rec.recommendedPrice === 'number' && typeof rec.compMedian === 'number' && rec.compMedian > 0
      ? (rec.recommendedPrice - rec.compMedian) / rec.compMedian
      : null;

  const trendIcon =
    delta === null ? <Minus size={10} /> : delta > 0.02 ? <TrendingUp size={10} /> : delta < -0.02 ? <TrendingDown size={10} /> : <Minus size={10} />;

  const factors = rec.factors ?? [];
  const topFactors = [...factors]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 5);

  return (
    <>
      <button
        type="button"
        data-testid="repull-price-cell"
        data-listing={String(listingId)}
        data-date={date}
        onClick={() => setShowModal(true)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80',
          compDeltaClasses(delta),
          className,
        )}
        aria-label={`Price recommendation for ${date}`}
      >
        {trendIcon}
        <span>{formatMoney(rec.recommendedPrice, currency)}</span>
      </button>

      {showModal && (
        <div
          data-testid="repull-price-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[170] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/[0.08] dark:bg-[#141414]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                  Pricing breakdown
                </h3>
                <p className="text-xs text-gray-500 dark:text-white/50">
                  Listing {String(listingId)} · {date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md bg-gray-50 p-3 text-center text-xs dark:bg-white/[0.04]">
              <div>
                <p className="text-gray-500 dark:text-white/50">Current</p>
                <p className="font-semibold text-gray-900 dark:text-white/90">
                  {formatMoney(rec.currentPrice, currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-white/50">Recommended</p>
                <p className="font-semibold text-gray-900 dark:text-white/90">
                  {formatMoney(rec.recommendedPrice, currency)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-white/50">Comp median</p>
                <p className="font-semibold text-gray-900 dark:text-white/90">
                  {formatMoney(rec.compMedian, currency)}
                </p>
              </div>
            </div>

            <h4 className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
              Top factors
            </h4>
            {topFactors.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-white/50">
                Not enough signal yet — recommendation comes from the global prior.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {topFactors.map((f, idx) => (
                  <li
                    key={`${f.factor}-${idx}`}
                    data-testid="repull-price-factor"
                    className="flex items-center justify-between rounded border border-gray-100 px-2 py-1 text-xs dark:border-white/[0.06]"
                  >
                    <span className="text-gray-700 dark:text-white/80">{f.factor}</span>
                    <span
                      className={cn(
                        'font-mono text-xs',
                        f.impact > 0
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-rose-600 dark:text-rose-300',
                      )}
                    >
                      {f.impact > 0 ? '+' : ''}
                      {(f.impact * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
