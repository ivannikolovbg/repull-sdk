'use client';

import { useMemo } from 'react';
import type { AuthState } from './auth-bar';
import { CodePanel, type CodeSnippet } from './code-panel';
import { MarketsCard } from './markets-card';
import { PricingCard } from './pricing-card';

/**
 * "Live market intelligence" section — showcases two beta endpoints:
 *   - `GET /v1/markets`           (Atlas market overview)
 *   - `GET /v1/listings/{id}/pricing`  (Atlas pricing recommendations)
 *
 * Both surfaces are powered by Atlas, Vanio's market-intelligence fleet
 * (660 live workers as of 2026-04-22). The section sits between the
 * channel grid and the connections list so it shows up immediately after
 * a user pastes a key — no extra clicks needed.
 */
export function MarketIntelligence({ auth }: { auth: AuthState }) {
  const snippets = useMemo<CodeSnippet[]>(
    () => [
      {
        label: 'TS',
        language: 'ts',
        code: `import { Repull } from '@repull/sdk';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY });

// Markets your workspace operates in (ADR diff vs comps, occupancy, share).
const markets = await repull.markets.list();

// Pricing recommendations for a listing's next 7 days.
const recs = await repull.listings.pricing.recommendations(listingId, {
  startDate: '2026-05-01',
  endDate:   '2026-05-08',
});

// Apply the recommendation for a single date.
await repull.listings.pricing.action(listingId, {
  dates: ['2026-05-04'],
  action: 'apply',
});`,
      },
      {
        label: 'curl',
        language: 'curl',
        code: `# Markets overview
curl 'https://api.repull.dev/v1/markets' \\
  -H 'Authorization: Bearer $REPULL_API_KEY'

# Pricing recommendations (next 90 days by default)
curl 'https://api.repull.dev/v1/listings/4118/pricing' \\
  -H 'Authorization: Bearer $REPULL_API_KEY'

# Apply a single date
curl -X POST 'https://api.repull.dev/v1/listings/4118/pricing' \\
  -H 'Authorization: Bearer $REPULL_API_KEY' \\
  -H 'content-type: application/json' \\
  -d '{"dates":["2026-05-04"],"action":"apply"}'`,
      },
    ],
    [],
  );

  return (
    <section className="card overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.08] flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="section-h2">Live market intelligence</h2>
          <p className="text-xs muted mt-0.5 max-w-xl">
            Atlas — the market-intelligence fleet behind Repull — surfaces ADR vs comps and
            day-by-day pricing recommendations for every connected listing.
          </p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
          style={{
            background: 'rgba(255, 122, 43, 0.1)',
            border: '1px solid rgba(255, 122, 43, 0.4)',
            color: '#ffb389',
          }}
        >
          Beta
        </span>
      </header>

      <div className="grid lg:grid-cols-2 gap-px bg-white/[0.04]">
        <div className="bg-[#0b0b0b] p-5">
          <MarketsCard auth={auth} />
        </div>
        <div className="bg-[#0b0b0b] p-5">
          <PricingCard auth={auth} />
        </div>
      </div>

      <div className="bg-[#080808] p-5 border-t border-white/[0.04]">
        <CodePanel
          title="SDK calls"
          endpoint="GET /v1/markets · GET /v1/listings/{id}/pricing"
          snippets={snippets}
        />
      </div>
    </section>
  );
}
