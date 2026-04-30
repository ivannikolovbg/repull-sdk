'use client';

import { useEffect, useState } from 'react';
import { RepullProvider, useRepull } from '@/lib/repull-provider';
import { AuthBar } from '@/components/auth-bar';

interface AirbnbListing {
  listingId: number | string;
  name?: string;
  city?: string;
  connections?: Array<{ id?: string; airbnbId?: string; active?: boolean }>;
}

function ListingsList() {
  const { client, apiKey } = useRepull();
  const [items, setItems] = useState<AirbnbListing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setItems(null);
      return;
    }
    setLoading(true);
    setError(null);
    client.channels.airbnb.listings
      .list({ limit: 25 })
      .then((res) => {
        const arr = Array.isArray(res)
          ? (res as AirbnbListing[])
          : ((res as { data?: AirbnbListing[] }).data ?? []);
        setItems(arr);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [apiKey, client]);

  return (
    <aside className="card flex flex-col h-full overflow-hidden">
      <header className="px-4 py-3 border-b border-white/[0.08]">
        <div className="text-xs uppercase tracking-wide muted">Listings</div>
        <div className="text-sm">
          {loading ? 'Loading…' : items ? `${items.length} listing${items.length === 1 ? '' : 's'}` : '—'}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {!apiKey ? (
          <div className="p-4 muted text-sm">Add an API key above.</div>
        ) : error ? (
          <div className="p-4 text-xs font-mono text-red-400">{error}</div>
        ) : !items || items.length === 0 ? (
          <div className="p-4 muted text-sm">No listings yet. Connect Airbnb via the demo first.</div>
        ) : (
          <ul>
            {items.map((l) => (
              <li
                key={String(l.listingId)}
                className="cursor-pointer px-4 py-3 border-b border-white/[0.04]"
                style={{
                  background:
                    selectedId === String(l.listingId)
                      ? 'rgba(255,122,43,0.1)'
                      : 'transparent',
                }}
                onClick={() => setSelectedId(String(l.listingId))}
              >
                <div className="text-sm font-medium truncate">{l.name ?? `Listing ${l.listingId}`}</div>
                <div className="text-xs muted font-mono truncate">
                  {l.city ?? '—'} · {(l.connections ?? []).length} airbnb conn(s)
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Workspace() {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div>
        <div className="text-xs uppercase tracking-wide muted">Workspace</div>
        <h2 className="text-xl font-semibold">Calendar &amp; pricing</h2>
        <p className="muted text-sm mt-1 max-w-xl">
          This is where you&apos;d render the calendar heatmap and pricing rule editor for the selected
          listing. The starter ships the auth + listings rail wired up; the rest is yours.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-2">
        <Stub title="Availability calendar" endpoint="GET/PUT /v1/channels/airbnb/listings/{id}/availability" />
        <Stub title="Pricing rules" endpoint="GET/PUT /v1/channels/airbnb/listings/{id}/pricing" />
        <Stub title="Messaging" endpoint="GET/POST /v1/channels/airbnb/messaging/{threadId}/messages" />
        <Stub title="Bulk sync" endpoint="POST /v1/channels/airbnb/sync" />
      </div>
    </section>
  );
}

function Stub({ title, endpoint }: { title: string; endpoint: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/[0.12] p-4 bg-black/30 space-y-1.5">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs muted font-mono">{endpoint}</div>
      <div className="text-xs muted">Coming soon — fork and build.</div>
    </div>
  );
}

export default function Page() {
  return (
    <RepullProvider>
      <main className="min-h-screen p-4 md:p-6 space-y-4">
        <header>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
            create-repull-channel-manager
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">Skeletal starter</h1>
          <p className="muted text-sm mt-1 max-w-2xl">
            Forkable starter for a Repull-powered channel manager. v0.1.0-alpha. Add your real calendar /
            pricing / messaging on top of <code>@repull/sdk</code>.
          </p>
        </header>

        <AuthBar />

        <div className="grid md:grid-cols-[280px_1fr] gap-4 min-h-[60vh]">
          <ListingsList />
          <Workspace />
        </div>

        <footer className="text-xs muted pt-4 border-t border-white/[0.06]">
          Powered by Repull · <a className="underline decoration-dotted" href="https://repull.dev">repull.dev</a>
        </footer>
      </main>
    </RepullProvider>
  );
}
