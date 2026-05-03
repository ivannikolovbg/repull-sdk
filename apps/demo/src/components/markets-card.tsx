'use client';

import { useEffect, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { MarketSummary, MarketsResponse } from '@repull/sdk';

/**
 * "Live markets" card — calls `GET /v1/markets` and renders the top 3
 * markets the customer operates in as compact summary tiles. Surfaces
 * Atlas KPIs (ADR diff vs market, occupancy bar, share %).
 */
export function MarketsCard({ auth }: { auth: AuthState }) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [data, setData] = useState<MarketsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      setData(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    setLoading(true);
    setError(null);
    client.markets
      .list()
      .then((res) => setData(res))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ready, auth.apiKey, auth.useSandbox]);

  const markets: MarketSummary[] = (data?.data ?? []).slice(0, 3);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/30 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/90">Live markets</h3>
        <span className="text-[11px] muted">
          <span className="kbd">GET /v1/markets</span>
        </span>
      </div>
      {!ready ? (
        <p className="muted text-xs">Add an API key above.</p>
      ) : loading ? (
        <MarketsSkeleton />
      ) : error ? (
        <ErrorBox message={error} />
      ) : markets.length === 0 ? (
        <p className="muted text-xs">
          No markets yet. Atlas tracks markets where this workspace has at least one active listing.
        </p>
      ) : (
        <ul className="space-y-2">
          {markets.map((m) => (
            <MarketRow key={m.city} market={m} />
          ))}
        </ul>
      )}
      {data?.totals ? (
        <div className="text-[11px] muted pt-1 border-t border-white/[0.04]">
          {data.totals.markets} market{data.totals.markets === 1 ? '' : 's'} ·{' '}
          {data.totals.myListings} listing{data.totals.myListings === 1 ? '' : 's'}
          {typeof data.totals.totalCompetitors === 'number'
            ? ` · ${data.totals.totalCompetitors.toLocaleString()} comps tracked`
            : ''}
        </div>
      ) : null}
    </div>
  );
}

function MarketRow({ market }: { market: MarketSummary }) {
  const diff = market.priceDiffPct;
  const diffColor =
    diff == null ? 'rgba(255,255,255,0.5)' : diff > 0 ? '#3ecf8e' : diff < 0 ? '#ff7a7a' : 'rgba(255,255,255,0.7)';
  const diffLabel =
    diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff}%`;

  const occ = market.marketOccupancyPct;
  const occClamped = occ == null ? null : Math.max(0, Math.min(100, occ));

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-white/90 truncate">{market.city}</div>
          <div className="text-[10px] muted">
            {market.myListings} of {(market.totalListings ?? 0).toLocaleString()} comps
            {market.marketSharePct != null ? ` · ${market.marketSharePct}% share` : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px]" style={{ color: diffColor }}>
            ADR {diffLabel} vs market
          </div>
          <div className="text-[10px] muted font-mono">
            {market.myAvgAdr != null ? `$${Math.round(market.myAvgAdr)}` : '—'}
            {' / '}
            {market.marketAvgAdr != null ? `$${Math.round(market.marketAvgAdr)}` : '—'}
          </div>
        </div>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        title={occ != null ? `Market occupancy (next 30d): ${occ}%` : undefined}
      >
        {occClamped != null ? (
          <div
            className="h-full"
            style={{
              width: `${occClamped}%`,
              background: 'linear-gradient(90deg, rgba(76,110,245,0.6), rgba(255,122,43,0.55))',
            }}
          />
        ) : null}
      </div>
    </li>
  );
}

function MarketsSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-24 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-md text-[11px] p-2 font-mono"
      style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
    >
      {message}
    </div>
  );
}
