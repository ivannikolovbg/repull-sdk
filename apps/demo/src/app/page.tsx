'use client';

import { useCallback, useState } from 'react';
import { AuthBar, type AuthState } from '@/components/auth-bar';
import { ConnectPicker } from '@/components/connect-picker';
import { ChannelGrid } from '@/components/channel-grid';
import { ConnectionsList } from '@/components/connections-list';
import { ConnectAirbnb } from '@/components/connect-airbnb';
import { ReservationsTable } from '@/components/reservations-table';
import { PropertiesList } from '@/components/properties-list';
import { AirbnbListings } from '@/components/airbnb-listings';
import { HealthPill } from '@/components/health-pill';

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ apiKey: null, useSandbox: false });
  const [connectionsRefreshKey, setConnectionsRefreshKey] = useState(0);

  const handleConnected = useCallback(() => {
    setConnectionsRefreshKey((n) => n + 1);
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs uppercase tracking-[0.2em]"
              style={{ color: '#ff7a2b', letterSpacing: '0.2em' }}
            >
              Repull SDK
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-white/[0.1] text-white/50">
              v0.1.0-alpha
            </span>
          </div>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            Build vacation-rental tech in TypeScript.
          </h1>
          <p className="muted text-sm md:text-base mt-2 max-w-2xl">
            One SDK over <span className="kbd">api.repull.dev</span> — Airbnb, Booking.com, VRBO, Plum Guide,
            and 9 PMS connectors behind a single hosted Connect picker. Mint a session, send the user, get
            a connection back.
          </p>
        </div>
        <HealthPill />
      </header>

      <AuthBar state={auth} onChange={setAuth} />

      <ChannelGrid auth={auth} />

      <ConnectPicker auth={auth} onConnected={handleConnected} />

      <ConnectionsList auth={auth} refreshKey={connectionsRefreshKey} />

      <section className="space-y-3">
        <div>
          <h2 className="section-h2">Direct integrations</h2>
          <p className="text-xs muted mt-0.5 max-w-xl">
            Most apps use the multi-channel picker above. Direct OAuth is for apps that only need
            Airbnb and want to skip the chooser screen entirely.
          </p>
        </div>
        <ConnectAirbnb auth={auth} />
      </section>

      <AirbnbListings auth={auth} />
      <ReservationsTable auth={auth} />
      <PropertiesList auth={auth} />

      <footer className="pt-6 border-t border-white/[0.06] text-xs muted flex flex-wrap items-center justify-between gap-3">
        <div>
          Powered by Repull · <a href="https://repull.dev" className="underline decoration-dotted">repull.dev</a> ·{' '}
          <a href="https://github.com/ivannikolovbg/repull-sdk" className="underline decoration-dotted">GitHub</a>
        </div>
        <div>
          Alpha. Not production-ready. License is{' '}
          <a href="https://github.com/ivannikolovbg/repull-sdk/blob/main/LICENSE.md" className="underline decoration-dotted">
            Repull SDK Community License
          </a>
          .
        </div>
      </footer>
    </main>
  );
}
