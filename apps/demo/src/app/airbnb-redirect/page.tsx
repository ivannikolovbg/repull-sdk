'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { makeClient, getStoredKey } from '@/lib/repull-client';
import type { ConnectStatus } from '@repull/sdk';
import Link from 'next/link';

function formatCreatedAt(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HostInitial({ name }: { name: string | null | undefined }) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="flex items-center justify-center text-sm font-semibold text-white/85"
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
        background: 'rgba(255, 122, 43, 0.18)',
        border: '1px solid rgba(255, 122, 43, 0.45)',
      }}
    >
      {initial}
    </div>
  );
}

function HostCard({ status }: { status: ConnectStatus }) {
  const host = status.host ?? null;
  const displayName = host?.displayNameLong || host?.displayName || null;
  const avatar = host?.avatarUrlLarge || host?.avatarUrl || null;
  const externalId = String(status.externalAccountId ?? '');
  const createdAt = formatCreatedAt(status.createdAt);
  const profileUrl = externalId
    ? `https://www.airbnb.com/users/show/${encodeURIComponent(externalId)}`
    : null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(62, 207, 142, 0.06)',
        border: '1px solid rgba(62, 207, 142, 0.45)',
      }}
    >
      <div className="flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={displayName ?? 'Airbnb host avatar'}
            width={56}
            height={56}
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          />
        ) : (
          <HostInitial name={displayName} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-white/95 truncate">
            {displayName ?? 'Airbnb host connected'}
          </div>
          <div className="text-xs muted mt-0.5 truncate">
            Connected to Repull
            {externalId ? <> · ID {externalId}</> : null}
            {createdAt ? <> · {createdAt}</> : null}
          </div>
          {profileUrl ? (
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs mt-2 underline decoration-dotted"
              style={{ color: '#ff7a2b' }}
            >
              View on Airbnb ↗
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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

      {status?.connected ? <HostCard status={status} /> : null}

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
