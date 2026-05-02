'use client';

import { useEffect, useState, useMemo } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { Reservation, ReservationListResponse } from '@repull/sdk';
import { CodePanel, type CodeSnippet } from './code-panel';

const PAGE_SIZE = 10;

export function ReservationsTable({ auth }: { auth: AuthState }) {
  const ready = Boolean(auth.apiKey || auth.useSandbox);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ReservationListResponse<Reservation> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!ready) {
      setData(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    setLoading(true);
    setError(null);
    client.reservations
      .list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE, status: statusFilter || undefined })
      .then((res) => setData(res))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ready, page, statusFilter, auth.apiKey, auth.useSandbox]);

  const snippets = useMemo<CodeSnippet[]>(() => {
    const filterPart = statusFilter ? `, status: ${JSON.stringify(statusFilter)}` : '';
    return [
      {
        label: 'TS',
        language: 'ts',
        code: `const { data, pagination } = await repull.reservations.list({
  limit: ${PAGE_SIZE},
  offset: ${page * PAGE_SIZE}${filterPart}
});`,
      },
      {
        label: 'curl',
        language: 'curl',
        code: `curl 'https://api.repull.dev/v1/reservations?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${
          statusFilter ? `&status=${statusFilter}` : ''
        }' \\
  -H 'Authorization: Bearer $REPULL_API_KEY'`,
      },
    ];
  }, [page, statusFilter]);

  const total = data?.pagination?.total ?? 0;
  const showing = data?.data ?? [];

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-h2">Reservations</h2>
          <p className="text-xs muted mt-0.5">Real data from your API key. Read-only in v0.1.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setPage(0);
              setStatusFilter(e.target.value);
            }}
            style={{ width: 'auto' }}
          >
            <option value="">all statuses</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
            <option value="pending">pending</option>
          </select>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-px bg-white/[0.04]">
        <div className="bg-[#0b0b0b] p-5 space-y-3">
          {!ready ? (
            <p className="muted text-sm">Add an API key above to load reservations.</p>
          ) : loading ? (
            <p className="muted text-sm">Loading…</p>
          ) : error ? (
            <div
              className="rounded-md text-xs p-3 font-mono"
              style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
            >
              {error}
            </div>
          ) : showing.length === 0 ? (
            <p className="muted text-sm">No reservations found for this key.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-white/45">
                  <tr>
                    <th className="text-left px-3 py-2 font-normal">ID</th>
                    <th className="text-left px-3 py-2 font-normal">Status</th>
                    <th className="text-left px-3 py-2 font-normal">Channel</th>
                    <th className="text-left px-3 py-2 font-normal">Check-in</th>
                    <th className="text-left px-3 py-2 font-normal">Check-out</th>
                    <th className="text-left px-3 py-2 font-normal">Guest</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {showing.map((r, i) => {
                    const row = r as unknown as Record<string, unknown>;
                    return (
                      <tr key={String(row.id ?? i)} className="border-t border-white/[0.05]">
                        <td className="px-3 py-2 text-white/85">{String(row.id ?? '—')}</td>
                        <td className="px-3 py-2 text-white/70">{String(row.status ?? '—')}</td>
                        <td className="px-3 py-2 text-white/70">
                          {String(row.platform ?? row.channel ?? row.source ?? '—')}
                        </td>
                        <td className="px-3 py-2 text-white/70">{String(row.checkIn ?? row.startDate ?? '—')}</td>
                        <td className="px-3 py-2 text-white/70">{String(row.checkOut ?? row.endDate ?? '—')}</td>
                        <td className="px-3 py-2 text-white/70 truncate max-w-[16ch]">
                          {String((row.guest as { name?: string } | undefined)?.name ?? row.guestName ?? '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between text-xs muted">
            <span>
              {showing.length > 0
                ? `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + showing.length} of ${total}`
                : '—'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || (page + 1) * PAGE_SIZE >= total}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#080808] p-5">
          <CodePanel title="SDK call" endpoint="GET /v1/reservations" snippets={snippets} />
        </div>
      </div>
    </section>
  );
}
