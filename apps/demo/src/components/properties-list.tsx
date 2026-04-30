'use client';

import { useEffect, useMemo, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { ListResponse, Property } from '@repull/sdk';
import { CodePanel, type CodeSnippet } from './code-panel';

export function PropertiesList({ auth }: { auth: AuthState }) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [data, setData] = useState<ListResponse<Property> | null>(null);
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
    client.properties
      .list({ limit: 12 })
      .then((res) => setData(res))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ready, auth.apiKey, auth.useSandbox]);

  const snippets = useMemo<CodeSnippet[]>(
    () => [
      {
        label: 'TS',
        language: 'ts',
        code: `const { data, pagination } = await repull.properties.list({ limit: 12 });`,
      },
      {
        label: 'curl',
        language: 'curl',
        code: `curl 'https://api.repull.dev/v1/properties?limit=12' \\
  -H 'Authorization: Bearer $REPULL_API_KEY'`,
      },
    ],
    [],
  );

  const items = data?.data ?? [];
  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08]">
        <h2 className="section-h2">Properties</h2>
        <p className="text-xs muted mt-0.5">Aggregated across every connected channel.</p>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-px bg-white/[0.04]">
        <div className="bg-[#0b0b0b] p-5 space-y-3">
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
          ) : items.length === 0 ? (
            <p className="muted text-sm">No properties returned for this key. Connect a channel first.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map((p, i) => {
                const row = p as unknown as Record<string, unknown>;
                return (
                  <li
                    key={String(row.id ?? i)}
                    className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs space-y-1"
                  >
                    <div className="text-white/85 font-medium">{String(row.name ?? row.title ?? `Property #${row.id}`)}</div>
                    <div className="font-mono text-white/45">id {String(row.id ?? '—')}</div>
                    <div className="font-mono text-white/45 truncate">
                      {String(row.city ?? row.address ?? row.location ?? '—')}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-[#080808] p-5">
          <CodePanel title="SDK call" endpoint="GET /v1/properties" snippets={snippets} />
        </div>
      </div>
    </section>
  );
}
