import * as React from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import type { RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullCalendar } from '@repull/components/RepullCalendar';
 *
 * <RepullCalendar
 *   client={repull}
 *   mode="listings"
 *   listingIds={['L-1', 'L-2']}
 *   from="2026-05-01"
 *   to="2026-05-14"
 *   onCellClick={({ listingId, date }) => console.log(listingId, date)}
 * />
 * ```
 */

export interface RepullCalendarProps {
  client: RepullClientLike;
  mode: 'listings' | 'reservations';
  listingIds?: string[];
  from: string; // ISO date YYYY-MM-DD
  to: string; // ISO date YYYY-MM-DD
  onCellClick?: (cell: { listingId: string; date: string }) => void;
  className?: string;
}

interface ReservationLite {
  id: string;
  listingId?: string | number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface ListingLite {
  id: string | number;
  title?: string;
}

function buildDateRange(from: string, to: string): string[] {
  const start = parseISO(from);
  const end = parseISO(to);
  const span = differenceInCalendarDays(end, start);
  if (span < 0 || Number.isNaN(span)) return [];
  const out: string[] = [];
  for (let i = 0; i <= span; i++) {
    out.push(format(addDays(start, i), 'yyyy-MM-dd'));
  }
  return out;
}

export function RepullCalendar({
  client,
  mode,
  listingIds,
  from,
  to,
  onCellClick,
  className,
}: RepullCalendarProps): React.ReactElement {
  const dates = React.useMemo(() => buildDateRange(from, to), [from, to]);
  const [listings, setListings] = React.useState<ListingLite[]>([]);
  const [reservations, setReservations] = React.useState<ReservationLite[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const listingList = client.listings?.list;
        const reservationList = client.reservations?.list;
        const promises: Promise<unknown>[] = [];

        if (typeof listingList === 'function') {
          promises.push(
            listingList({ limit: 100 }).then((res) => {
              if (cancelled) return;
              const data = (res as { data?: ListingLite[] }).data ?? [];
              const filtered = listingIds && listingIds.length > 0
                ? data.filter((l) => listingIds.includes(String(l.id)))
                : data;
              setListings(filtered);
            }),
          );
        } else {
          setListings([]);
        }

        if (typeof reservationList === 'function') {
          promises.push(
            reservationList({ startDate: from, endDate: to, limit: 200 }).then((res) => {
              if (cancelled) return;
              const data = (res as { data?: ReservationLite[] }).data ?? [];
              setReservations(data);
            }),
          );
        } else {
          setReservations([]);
        }

        await Promise.all(promises);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load calendar.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, from, to, listingIds]);

  const isReserved = (listingId: string, date: string): ReservationLite | null => {
    return (
      reservations.find((r) => {
        if (String(r.listingId) !== listingId) return false;
        if (!r.startDate || !r.endDate) return false;
        return date >= r.startDate && date < r.endDate;
      }) ?? null
    );
  };

  const visibleListings = mode === 'reservations' && listingIds && listingIds.length > 0
    ? listings.filter((l) => listingIds.includes(String(l.id)))
    : listings;

  if (loading) {
    return (
      <div
        data-testid="repull-calendar"
        className={cn(
          'rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]',
          className,
        )}
      >
        <Skeleton className="mb-2 h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="repull-calendar"
        className={cn(
          'rounded-xl border border-gray-200 p-6 text-sm text-red-500 dark:border-white/[0.08]',
          className,
        )}
      >
        {error}
      </div>
    );
  }

  if (visibleListings.length === 0 || dates.length === 0) {
    return (
      <div
        data-testid="repull-calendar"
        className={cn(
          'rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500 dark:border-white/[0.08]',
          className,
        )}
      >
        Nothing to show. Pick a date range and at least one listing to see the calendar.
      </div>
    );
  }

  return (
    <div
      data-testid="repull-calendar"
      className={cn(
        'overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.08]',
        className,
      )}
    >
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-white/[0.03]">
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700 dark:bg-white/[0.03] dark:text-white/80">
              Listing
            </th>
            {dates.map((d) => (
              <th key={d} className="px-2 py-2 text-center font-medium text-gray-500 dark:text-white/60">
                {format(parseISO(d), 'MMM d')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleListings.map((l) => (
            <tr key={String(l.id)} className="border-t border-gray-100 dark:border-white/[0.04]">
              <td className="sticky left-0 z-10 truncate bg-white px-3 py-1.5 font-medium text-gray-800 dark:bg-[#0d0d0d] dark:text-white/80">
                {l.title ?? `Listing ${l.id}`}
              </td>
              {dates.map((d) => {
                const reservation = isReserved(String(l.id), d);
                const reserved = Boolean(reservation);
                return (
                  <td key={d} className="p-0.5">
                    <button
                      type="button"
                      onClick={
                        onCellClick
                          ? () => onCellClick({ listingId: String(l.id), date: d })
                          : undefined
                      }
                      data-testid="repull-calendar-cell"
                      data-listing={String(l.id)}
                      data-date={d}
                      data-reserved={reserved ? 'true' : 'false'}
                      aria-label={`${l.title ?? l.id} on ${d}${reserved ? ' (booked)' : ''}`}
                      className={cn(
                        'h-7 w-full rounded-sm border text-[10px] transition-colors',
                        reserved
                          ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                          : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-white/[0.04] dark:bg-transparent dark:hover:bg-white/[0.04]',
                      )}
                    >
                      {reserved ? '·' : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
