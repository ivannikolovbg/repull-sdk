'use client';

import { useEffect, useMemo, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import { CodePanel, type CodeSnippet } from './code-panel';

interface AirbnbListing {
  listingId: number | string;
  name?: string;
  city?: string;
  connections?: Array<{
    id?: string;
    airbnbId?: string;
    hostId?: string;
    active?: boolean;
    syncEnabled?: boolean;
    primary?: boolean;
    markup?: string;
    createdAt?: string;
  }>;
}

export function AirbnbListings({ auth }: { auth: AuthState }) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [items, setItems] = useState<AirbnbListing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      setItems(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    setLoading(true);
    setError(null);
    client.channels.airbnb.listings
      .list({ limit: 8 })
      .then((res) => {
        // The endpoint returns either a bare array or { data }.
        const arr = Array.isArray(res)
          ? (res as AirbnbListing[])
          : ((res as { data?: AirbnbListing[] }).data ?? []);
        setItems(arr);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ready, auth.apiKey, auth.useSandbox]);

  const snippets = useMemo<CodeSnippet[]>(
    () => [
      {
        label: 'TS',
        language: 'ts',
        code: `const listings = await repull.channels.airbnb.listings.list({ limit: 8 });
// Each entry exposes its 'connections' array — one per linked Airbnb listing.`,
      },
      {
        label: 'curl',
        language: 'curl',
        code: `curl 'https://api.repull.dev/v1/channels/airbnb/listings?limit=8' \\
  -H 'Authorization: Bearer $REPULL_API_KEY'`,
      },
    ],
    [],
  );

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08]">
        <h2 className="section-h2">Airbnb listings</h2>
        <p className="text-xs muted mt-0.5">Read-only — including each listing&apos;s linked Airbnb account(s).</p>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-px bg-white/[0.04]">
        <div className="bg-[#0b0b0b] p-5">
          {!ready ? (
            <p className="muted text-sm">Add an API key above.</p>
          ) : loading ? (
            <p className="muted text-sm">Loading…</p>
          ) : error ? (
            <div
              className="rounded-md text-xs p-3 font-mono"
              style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
            >
              {error}
            </div>
          ) : !items || items.length === 0 ? (
            <p className="muted text-sm">No Airbnb listings yet. Connect Airbnb above to populate this list.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={String(l.listingId)} className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-white/85 truncate">{l.name ?? `Listing ${l.listingId}`}</div>
                    <span className="font-mono text-white/45">{l.city ?? '—'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(l.connections ?? []).map((c) => (
                      <span
                        key={c.id}
                        className="font-mono"
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '10.5px',
                          background: c.active ? 'rgba(62,207,142,0.12)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (c.active ? 'rgba(62,207,142,0.4)' : 'rgba(255,255,255,0.1)'),
                          color: c.active ? '#3ecf8e' : 'rgba(255,255,255,0.5)',
                        }}
                        title={`hostId ${c.hostId} · airbnbId ${c.airbnbId}${c.primary ? ' · primary' : ''}`}
                      >
                        {c.primary ? '★ ' : ''}
                        {c.airbnbId}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[#080808] p-5">
          <CodePanel title="SDK call" endpoint="GET /v1/channels/airbnb/listings" snippets={snippets} />
        </div>
      </div>
    </section>
  );
}
