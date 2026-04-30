'use client';

import { useState } from 'react';
import { AuthBar, type AuthState } from '@/components/auth-bar';
import { ConnectAirbnb } from '@/components/connect-airbnb';
import { ReservationsTable } from '@/components/reservations-table';
import { PropertiesList } from '@/components/properties-list';
import { AirbnbListings } from '@/components/airbnb-listings';
import { HealthPill } from '@/components/health-pill';

export default function Home() {
  const [auth, setAuth] = useState<AuthState>({ apiKey: null, useSandbox: false });

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
            One SDK over <span className="kbd">api.repull.dev</span> — Airbnb, Booking.com, VRBO, Plumguide,
            50+ PMS connectors, white-label OAuth, listings, reservations, calendars, messaging. Try the
            flagship Airbnb OAuth flow below against a real key.
          </p>
        </div>
        <HealthPill />
      </header>

      <AuthBar state={auth} onChange={setAuth} />

      <ConnectAirbnb auth={auth} />
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
