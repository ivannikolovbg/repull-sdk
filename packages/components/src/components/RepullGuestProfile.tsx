import * as React from 'react';
import { Mail, Phone, Star, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import type { RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullGuestProfile } from '@repull/components/RepullGuestProfile';
 *
 * <RepullGuestProfile client={repull} guestId="G-123" />
 * ```
 */

export interface RepullGuestProfileProps {
  client: RepullClientLike;
  guestId: string | number;
  className?: string;
}

interface GuestLite {
  id: string | number;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface ReservationLite {
  id: string | number;
  startDate?: string;
  endDate?: string;
  totalAmount?: number;
  currency?: string;
  status?: string;
}

function formatMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined) return '—';
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

export function RepullGuestProfile({
  client,
  guestId,
  className,
}: RepullGuestProfileProps): React.ReactElement {
  const [guest, setGuest] = React.useState<GuestLite | null>(null);
  const [reservations, setReservations] = React.useState<ReservationLite[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const guestGet = client.guests?.get;
    const reservationList = client.reservations?.list;

    const promises: Promise<void>[] = [];

    if (typeof guestGet === 'function') {
      promises.push(
        guestGet(guestId).then((g) => {
          if (!cancelled) setGuest(g as GuestLite);
        }),
      );
    } else {
      setError('This SDK build does not expose guests.get — upgrade @repull/sdk.');
    }

    if (typeof reservationList === 'function') {
      promises.push(
        reservationList({ guestId, limit: 50 }).then((res) => {
          if (cancelled) return;
          const data = (res as { data?: ReservationLite[] }).data ?? [];
          setReservations(data);
        }),
      );
    }

    Promise.all(promises)
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load guest.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, guestId]);

  if (loading) {
    return (
      <div
        data-testid="repull-guest-profile"
        className={cn(
          'space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]',
          className,
        )}
      >
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-40" />
        <div className="space-y-1.5 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div
        data-testid="repull-guest-profile"
        className={cn(
          'rounded-xl border border-gray-200 p-6 text-sm text-red-500 dark:border-white/[0.08]',
          className,
        )}
      >
        {error ?? 'Guest not found.'}
      </div>
    );
  }

  const totalRevenue = reservations.reduce(
    (sum, r) => sum + (typeof r.totalAmount === 'number' ? r.totalAmount : 0),
    0,
  );
  const currency = reservations.find((r) => r.currency)?.currency ?? 'USD';
  const isRepeat = reservations.length >= 2;

  return (
    <div
      data-testid="repull-guest-profile"
      className={cn(
        'space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-white/[0.08] dark:bg-white/[0.02]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
            {guest.name ?? 'Unnamed guest'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-white/50">Guest #{guest.id}</p>
        </div>
        {isRepeat && (
          <span
            data-testid="repull-guest-repeat-badge"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <Star size={10} /> Repeat
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-gray-700 dark:text-white/80">
        {guest.email && (
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-gray-400" />
            <a className="hover:underline" href={`mailto:${guest.email}`}>{guest.email}</a>
          </div>
        )}
        {guest.phone && (
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-gray-400" />
            <a className="hover:underline" href={`tel:${guest.phone}`}>{guest.phone}</a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 text-center dark:bg-white/[0.04]">
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50">Stays</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white/90">{reservations.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50">Total revenue</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white/90">{formatMoney(totalRevenue, currency)}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
          Recent stays
        </h4>
        {reservations.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-white/50">
            No stays on record yet. New bookings for this guest will appear here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {reservations.slice(0, 5).map((r) => (
              <li
                key={String(r.id)}
                data-testid="repull-guest-stay"
                className="flex items-center justify-between rounded-md border border-gray-100 px-2.5 py-1.5 text-xs dark:border-white/[0.04]"
              >
                <span className="flex items-center gap-2 text-gray-700 dark:text-white/80">
                  <CalendarIcon size={11} className="text-gray-400" />
                  {r.startDate ?? '—'} → {r.endDate ?? '—'}
                </span>
                <span className="text-gray-700 dark:text-white/80">
                  {formatMoney(r.totalAmount, r.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {guest.notes && (
        <div className="rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-white/70">
          {guest.notes}
        </div>
      )}
    </div>
  );
}
