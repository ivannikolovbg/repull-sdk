'use client';

import { useEffect, useMemo, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { PricingRecommendation, PricingResponse, Property } from '@repull/sdk';

/**
 * "Pricing recommendations" card — picks the first listing the customer
 * has and renders the next 7 days of recommended-vs-current rates as a
 * sparkline + a few factor chips.
 *
 * Listing pick is best-effort: we call `GET /v1/properties` and use
 * whichever id the upstream gives us. If the upstream returns no
 * properties we render an honest empty state and stop.
 */
export function PricingCard({ auth }: { auth: AuthState }) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingName, setListingName] = useState<string | null>(null);
  const [data, setData] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      setListingId(null);
      setData(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        // Pick the first listing this key can see. The upstream resolves
        // customerId from the key — we just take whatever id we're given.
        const props = await client.properties.list({ limit: 1 });
        const first = (props.data?.[0] ?? null) as Property | null;
        const idRaw = (first as unknown as Record<string, unknown> | null)?.id ?? null;
        if (idRaw == null) {
          if (!cancelled) {
            setListingId(null);
            setListingName(null);
          }
          return;
        }
        const idStr = String(idRaw);
        if (!cancelled) {
          setListingId(idStr);
          const nm = (first as unknown as Record<string, unknown>)?.name;
          setListingName(typeof nm === 'string' ? nm : null);
        }
        // Pull the next 7 days of recs.
        const today = new Date();
        const startDate = today.toISOString().slice(0, 10);
        const end = new Date(today);
        end.setUTCDate(end.getUTCDate() + 7);
        const endDate = end.toISOString().slice(0, 10);
        const recs = await client.listings.pricing.recommendations(idStr, {
          startDate,
          endDate,
        });
        if (!cancelled) setData(recs);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, auth.apiKey, auth.useSandbox]);

  const recs = useMemo(() => (data?.recommendations ?? []).slice(0, 7), [data]);
  const factorChips = useMemo(() => collectFactorChips(recs), [recs]);

  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/30 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/90">Pricing recommendations</h3>
        <span className="text-[11px] muted">
          <span className="kbd">GET /v1/listings/{'{id}'}/pricing</span>
        </span>
      </div>
      {!ready ? (
        <p className="muted text-xs">Add an API key above.</p>
      ) : loading ? (
        <PricingSkeleton />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !listingId ? (
        <p className="muted text-xs">
          No listings on this key. Connect a channel to start receiving Atlas pricing recommendations.
        </p>
      ) : recs.length === 0 ? (
        <p className="muted text-xs">
          No pending recommendations for {listingName ?? `listing ${listingId}`} in the next 7 days.
          Atlas re-trains nightly.
        </p>
      ) : (
        <>
          <div className="text-[11px] muted">
            Next 7 days · listing{' '}
            <span className="font-mono text-white/60">{listingName ?? listingId}</span>
          </div>
          <Sparkline recs={recs} />
          {factorChips.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {factorChips.map((chip) => (
                <li
                  key={chip}
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(76,110,245,0.12)',
                    border: '1px solid rgba(76,110,245,0.35)',
                    color: 'rgba(180,200,255,0.95)',
                  }}
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

function Sparkline({ recs }: { recs: PricingRecommendation[] }) {
  // Build a tiny inline SVG sparkline of recommended price over the window,
  // with an underlay line for current price (so the gap is the upside).
  const W = 280;
  const H = 64;
  const PAD = 4;
  const allPrices: number[] = [];
  for (const r of recs) {
    if (r.recommendedPrice != null) allPrices.push(r.recommendedPrice);
    if (r.currentPrice != null) allPrices.push(r.currentPrice);
  }
  if (allPrices.length === 0) return null;
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const span = Math.max(max - min, 1);

  const x = (i: number) =>
    PAD + (recs.length === 1 ? 0 : (i * (W - 2 * PAD)) / (recs.length - 1));
  const y = (price: number) => H - PAD - ((price - min) / span) * (H - 2 * PAD);

  const recPath = recs
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(r.recommendedPrice).toFixed(2)}`)
    .join(' ');
  const curPath = recs
    .map((r, i) =>
      r.currentPrice != null
        ? `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(r.currentPrice).toFixed(2)}`
        : '',
    )
    .filter(Boolean)
    .join(' ');

  const last = recs[recs.length - 1]!;
  const lastDelta =
    last.currentPrice != null
      ? Math.round(((last.recommendedPrice - last.currentPrice) / last.currentPrice) * 100)
      : null;
  const currency = last.currency ?? '$';

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block"
      >
        {curPath ? (
          <path
            d={curPath}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
        ) : null}
        <path
          d={recPath}
          fill="none"
          stroke="#ff7a2b"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {recs.map((r, i) => (
          <circle
            key={r.date}
            cx={x(i)}
            cy={y(r.recommendedPrice)}
            r={2.5}
            fill="#ff7a2b"
          >
            <title>
              {r.date}: rec {currency}
              {Math.round(r.recommendedPrice)}
              {r.currentPrice != null ? ` · current ${currency}${Math.round(r.currentPrice)}` : ''}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between text-[10px] muted mt-1">
        <span>
          rec range {currency}
          {Math.round(min)}–{currency}
          {Math.round(max)}
        </span>
        <span>
          last day:{' '}
          <span className="text-white/80 font-mono">
            {currency}
            {Math.round(last.recommendedPrice)}
          </span>
          {lastDelta != null ? (
            <span
              className="ml-1"
              style={{ color: lastDelta >= 0 ? '#3ecf8e' : '#ff7a7a' }}
            >
              ({lastDelta >= 0 ? '+' : ''}
              {lastDelta}%)
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-32 rounded bg-white/[0.06] animate-pulse" />
      <div className="h-16 rounded bg-white/[0.04] animate-pulse" />
      <div className="flex gap-1.5">
        <div className="h-4 w-16 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="h-4 w-20 rounded-full bg-white/[0.04] animate-pulse" />
      </div>
    </div>
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

/**
 * Pull a small, deduplicated list of human-readable factor chips out of the
 * model's free-form `factors` payload across the rec window. We bias toward
 * named events, demand signals, and seasonality flags — the things a host
 * actually wants to see at a glance.
 */
function collectFactorChips(recs: PricingRecommendation[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of recs) {
    const f = (r.factors ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(f)) {
      const label = humaniseFactor(k, v);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      out.push(label);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

function humaniseFactor(key: string, value: unknown): string | null {
  if (value == null || value === false) return null;
  // Common shapes the model emits.
  if (key === 'event' && typeof value === 'string') return value;
  if (key === 'demand' && typeof value === 'string') return `${capitalise(value)} demand`;
  if (key === 'season' && typeof value === 'string') return capitalise(value);
  if (key === 'weekend' && value === true) return 'Weekend';
  if (key === 'holiday' && (typeof value === 'string' || value === true)) {
    return typeof value === 'string' ? value : 'Holiday';
  }
  if (key === 'compShift' && typeof value === 'number') {
    return `Comp shift ${value > 0 ? '+' : ''}${value}%`;
  }
  if (typeof value === 'string') return capitalise(value);
  if (typeof value === 'number') return `${capitalise(key)} ${value}`;
  return capitalise(key);
}

function capitalise(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
