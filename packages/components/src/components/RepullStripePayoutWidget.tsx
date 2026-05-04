import * as React from 'react';
import { CreditCard, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../utils/skeleton.js';
import type { RepullClientLike } from '../utils/sdk.js';

/**
 * @example
 * ```tsx
 * import { RepullStripePayoutWidget } from '@repull/components/RepullStripePayoutWidget';
 *
 * <RepullStripePayoutWidget
 *   client={repull}
 *   onConnect={(url) => window.location.href = url}
 *   onDisconnect={() => console.log('disconnected')}
 * />
 * ```
 */

export interface RepullStripePayoutWidgetProps {
  client: RepullClientLike;
  onConnect?: (oauthUrl: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

interface ConnectStatusLite {
  connected?: boolean;
  accountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  defaultCurrency?: string;
  pendingPayout?: number;
  nextPayoutDate?: string;
  oauthUrl?: string;
  url?: string;
}

function formatMoney(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || amount === null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency ?? '$'}${amount.toFixed(2)}`;
  }
}

export function RepullStripePayoutWidget({
  client,
  onConnect,
  onDisconnect,
  className,
}: RepullStripePayoutWidgetProps): React.ReactElement {
  const [status, setStatus] = React.useState<ConnectStatusLite | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [version, setVersion] = React.useState<number>(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const statusFn = client.payments?.connectStatus;
    if (typeof statusFn !== 'function') {
      setError('This SDK build does not expose payments.connectStatus — upgrade @repull/sdk.');
      setLoading(false);
      return;
    }
    statusFn()
      .then((res) => {
        if (cancelled) return;
        setStatus(res as ConnectStatusLite);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payout status.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, version]);

  const handleConnect = async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const connect = client.payments?.connect;
      if (typeof connect !== 'function') {
        throw new Error('payments.connect is not available on this SDK build.');
      }
      const res = await connect({ redirectUrl: typeof window !== 'undefined' ? window.location.href : '' });
      const session = res as { url?: string; oauthUrl?: string };
      const url = session.url ?? session.oauthUrl;
      if (url) {
        onConnect?.(url);
      } else {
        throw new Error('Stripe did not return a redirect URL.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe onboarding.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const disconnect = client.payments?.disconnect;
      if (typeof disconnect !== 'function') {
        throw new Error('payments.disconnect is not available on this SDK build.');
      }
      await disconnect();
      onDisconnect?.();
      setVersion((v) => v + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        data-testid="repull-stripe-payout-widget"
        className={cn(
          'space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]',
          className,
        )}
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
    );
  }

  if (error && !status) {
    return (
      <div
        data-testid="repull-stripe-payout-widget"
        className={cn(
          'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
          className,
        )}
      >
        <div className="mb-1 flex items-center gap-2 font-medium">
          <AlertCircle size={14} /> Couldn't load payout status
        </div>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  const connected = Boolean(status?.connected);
  const ready = connected && status?.payoutsEnabled !== false;

  return (
    <div
      data-testid="repull-stripe-payout-widget"
      className={cn(
        'space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-white/[0.08] dark:bg-white/[0.02]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white/90">
          <CreditCard size={14} />
          Stripe payouts
        </h3>
        {connected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle size={10} /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/[0.06] dark:text-white/70">
            Not connected
          </span>
        )}
      </div>

      {!connected && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 dark:text-white/60">
            Connect a Stripe account to receive payouts directly. Takes about 2 minutes — no engineering needed.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={actionLoading}
            data-testid="repull-stripe-connect-button"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#635bff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5749f0] disabled:opacity-50"
          >
            {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            Connect Stripe
          </button>
        </div>
      )}

      {connected && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 text-xs dark:bg-white/[0.04]">
            <div>
              <p className="text-gray-500 dark:text-white/50">Pending payout</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white/90">
                {formatMoney(status?.pendingPayout, status?.defaultCurrency)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-white/50">Next payout</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white/90">
                {status?.nextPayoutDate ?? '—'}
              </p>
            </div>
          </div>

          {!ready && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Stripe needs a few more details before payouts can start. Check your Stripe dashboard.
            </p>
          )}

          {status?.accountId && (
            <p className="text-xs text-gray-500 dark:text-white/50">
              Account: <span className="font-mono">{status.accountId}</span>
            </p>
          )}

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={actionLoading}
            data-testid="repull-stripe-disconnect-button"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-white/80 dark:hover:bg-white/[0.04]"
          >
            {actionLoading ? <Loader2 size={12} className="animate-spin" /> : null}
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
