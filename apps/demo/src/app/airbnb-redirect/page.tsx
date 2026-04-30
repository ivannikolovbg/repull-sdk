'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { makeClient, getStoredKey } from '@/lib/repull-client';
import type { ConnectStatus } from '@repull/sdk';
import Link from 'next/link';

function AirbnbRedirectInner() {
  const params = useSearchParams();
  const sessionId = params?.get('sessionId') ?? params?.get('session_id') ?? null;
  const error = params?.get('error') ?? null;
  const errorDescription = params?.get('error_description') ?? null;

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getStoredKey();
    const client = makeClient({ apiKey, useSandbox: false });
    let mounted = true;

    async function check() {
      try {
        const s = await client.connect.airbnb.status();
        if (mounted) setStatus(s);
      } catch (err) {
        if (mounted) setProblem((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    check();
    const t = setInterval(check, 4_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 md:py-20 space-y-6">
      <Link href="/" className="text-xs muted underline decoration-dotted">
        ← back to demo
      </Link>

      <header>
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: '#ff7a2b', letterSpacing: '0.2em' }}
        >
          Airbnb Connect — return
        </span>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
          You came back from Airbnb.
        </h1>
        <p className="muted text-sm mt-2">
          This page is the <code className="kbd">redirectUrl</code> you supplied to{' '}
          <code className="kbd">repull.connect.airbnb.create()</code>. We poll{' '}
          <code className="kbd">repull.connect.airbnb.status()</code> until the connection lands.
        </p>
      </header>

      {error ? (
        <div
          className="rounded-md text-sm p-4 font-mono"
          style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
        >
          <div className="text-white/90 mb-1">{error}</div>
          {errorDescription ? <div className="text-white/65 text-xs">{errorDescription}</div> : null}
        </div>
      ) : null}

      {sessionId ? (
        <div className="card p-4 space-y-1">
          <div className="text-xs uppercase tracking-wide text-white/45">Session</div>
          <div className="font-mono text-xs text-white/80 break-all">{sessionId}</div>
        </div>
      ) : null}

      <div className="card p-5 space-y-3">
        <div className="text-xs uppercase tracking-wide text-white/45">Connection status</div>
        {loading && !status ? (
          <p className="muted text-sm">Polling…</p>
        ) : problem ? (
          <p className="text-sm text-red-400 font-mono">{problem}</p>
        ) : status ? (
          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-white/85">
            {JSON.stringify(status, null, 2)}
          </pre>
        ) : (
          <p className="muted text-sm">No status yet.</p>
        )}
        {status?.connected ? (
          <div
            className="rounded-md text-xs p-3 font-mono"
            style={{ background: 'rgba(62, 207, 142, 0.08)', border: '1px solid rgba(62, 207, 142, 0.45)' }}
          >
            ✓ Linked Airbnb account: <strong>{String(status.externalAccountId ?? '(unknown id)')}</strong>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="max-w-2xl mx-auto p-12 muted text-sm">Loading…</main>}>
      <AirbnbRedirectInner />
    </Suspense>
  );
}
