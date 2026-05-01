'use client';

import { useEffect, useState } from 'react';
import { makeClient } from '@/lib/repull-client';
import type { AuthState } from './auth-bar';
import type { ConnectProvider, ConnectPattern } from '@repull/sdk';

const PATTERN_COPY: Record<ConnectPattern, { label: string; tone: string }> = {
  oauth: { label: 'OAuth', tone: '#3ecf8e' },
  credentials: { label: 'Credentials', tone: '#9b8cff' },
  claim: { label: 'Claim', tone: '#f5a524' },
  activation: { label: 'Activation', tone: '#4dabff' },
};

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  live: { label: 'Live', tone: '#3ecf8e' },
  beta: { label: 'Beta', tone: '#f5a524' },
  coming_soon: { label: 'Soon', tone: '#888' },
};

/**
 * Renders the live channel catalogue from `GET /v1/connect/providers`,
 * grouped by category. Hovering a card surfaces the connect pattern.
 */
export function ChannelGrid({ auth }: { auth: AuthState }) {
  const [providers, setProviders] = useState<ConnectProvider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = Boolean(auth.apiKey || auth.useSandbox);

  useEffect(() => {
    if (!ready) {
      setProviders(null);
      return;
    }
    const client = makeClient({ apiKey: auth.apiKey, useSandbox: auth.useSandbox });
    setLoading(true);
    setError(null);
    client.connect
      .providers()
      .then((res) => setProviders(res.data ?? []))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [ready, auth.apiKey, auth.useSandbox]);

  const otas = (providers ?? []).filter((p) => p.category === 'ota');
  const pmses = (providers ?? []).filter((p) => p.category === 'pms');

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="section-h2">Connect any of these in one flow</h2>
          <p className="text-xs muted mt-0.5">
            Live from <span className="kbd">GET /v1/connect/providers</span>. The picker above renders the
            same list.
          </p>
        </div>
        {providers ? (
          <div className="text-xs muted">{providers.length} channels available</div>
        ) : null}
      </header>

      <div className="p-5 space-y-6">
        {!ready ? (
          <p className="muted text-sm">Add an API key above to load the live channel list.</p>
        ) : loading ? (
          <PlaceholderGrid />
        ) : error ? (
          <div
            className="rounded-md text-xs p-3 font-mono"
            style={{ background: 'rgba(255, 90, 90, 0.08)', border: '1px solid rgba(255, 90, 90, 0.4)' }}
          >
            {error}
          </div>
        ) : (
          <>
            <Group title="OTAs" subtitle="Direct distribution channels" items={otas} />
            <Group title="PMSes" subtitle="Property-management systems" items={pmses} />
          </>
        )}
      </div>
    </section>
  );
}

function Group({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ConnectProvider[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <h3 className="text-sm font-semibold text-white/85">{title}</h3>
        <span className="text-[11px] muted">{subtitle}</span>
        <span className="text-[11px] muted ml-auto">{items.length}</span>
      </div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((p) => (
          <ChannelCard key={p.id} provider={p} />
        ))}
      </ul>
    </div>
  );
}

function ChannelCard({ provider }: { provider: ConnectProvider }) {
  const pattern = PATTERN_COPY[provider.connectPattern] ?? { label: provider.connectPattern, tone: '#888' };
  const status = STATUS_COPY[provider.status] ?? { label: provider.status, tone: '#888' };
  return (
    <li
      className="group rounded-lg border border-white/[0.08] bg-black/30 p-3 flex items-center gap-3 hover:border-white/[0.18] transition"
      title={`${provider.displayName} · ${pattern.label} · ${status.label}`}
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {provider.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={provider.logoUrl}
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-[11px] font-mono text-white/55">{provider.id.slice(0, 3)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/90 truncate">{provider.displayName}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: pattern.tone }}
          >
            {pattern.label}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: status.tone }}>
            {status.label}
          </span>
        </div>
      </div>
    </li>
  );
}

function PlaceholderGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.06] bg-black/20 p-3 h-[60px] animate-pulse"
        />
      ))}
    </div>
  );
}
