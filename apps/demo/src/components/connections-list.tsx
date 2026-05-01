'use client';

import { useCallback, useEffect, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { Connection, ConnectProvider } from '@repull/sdk';

/**
 * Lightweight read-only "Your connections" panel. Calls `GET /v1/connect`
 * (workspace-wide list) and joins it against `GET /v1/connect/providers`
 * for logos + display names. Exposes a `refreshKey` prop the parent can
 * bump to force a reload after the picker reports completion.
 */
export function ConnectionsList({
  auth,
  refreshKey = 0,
}: {
  auth: AuthState;
  refreshKey?: number;
}) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [providers, setProviders] = useState<Record<string, ConnectProvider>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready) {
      setConnections(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    setLoading(true);
    setError(null);
    try {
      const [conns, provs] = await Promise.all([
        client.connect.list().catch(() => [] as Connection[]),
        client.connect.providers().catch(() => ({ data: [] as ConnectProvider[] })),
      ]);
      const map: Record<string, ConnectProvider> = {};
      for (const p of provs.data ?? []) map[p.id] = p;
      setProviders(map);
      // The API returns either `Connection[]` directly or `{ data: ... }`
      // depending on the route shape — normalise.
      const list = Array.isArray(conns) ? conns : ((conns as { data?: Connection[] }).data ?? []);
      setConnections(list);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [auth.apiKey, auth.useSandbox, ready]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
        <div>
          <h2 className="section-h2">Your connections</h2>
          <p className="text-xs muted mt-0.5">Live from <span className="kbd">GET /v1/connect</span>.</p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => void load()}
          disabled={!ready || loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="p-5">
        {!ready ? (
          <p className="muted text-sm">Add an API key above.</p>
        ) : loading && !connections ? (
          <p className="muted text-sm">Loading…</p>
        ) : error ? (
          <div
            className="rounded-md text-xs p-3 font-mono"
            style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
          >
            {error}
          </div>
        ) : !connections || connections.length === 0 ? (
          <p className="muted text-sm">
            No connections yet. Use the picker above to wire one up.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {connections.map((c, i) => {
              const row = c as unknown as Record<string, unknown>;
              const providerId = String(row.provider ?? '');
              const meta = providers[providerId];
              const status = String(row.status ?? '—');
              return (
                <li
                  key={String(row.id ?? i)}
                  className="rounded-lg border border-white/[0.08] bg-black/30 p-3 flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    {meta?.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={meta.logoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[11px] font-mono text-white/55">
                        {providerId.slice(0, 3) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="text-sm text-white/90 truncate">
                      {meta?.displayName ?? providerId}
                    </div>
                    <div className="font-mono text-white/45 truncate">
                      id {String(row.id ?? '—')} · {String(row.externalAccountId ?? '—')}
                    </div>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{
                      color: status === 'active' ? '#3ecf8e' : status === 'error' ? '#ff5757' : '#888',
                      borderColor:
                        status === 'active'
                          ? 'rgba(62,207,142,0.4)'
                          : status === 'error'
                            ? 'rgba(255,87,87,0.4)'
                            : 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
