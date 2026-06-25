# Repull SDK

> **Status:** v0.1.0-alpha — early preview. Not production-ready.

The official TypeScript SDK and interactive demo for [api.repull.dev](https://api.repull.dev) — the unified API for vacation-rental tech (50+ PMS platforms, Airbnb / Booking.com / VRBO / Plumguide channels, AI ops, white-label OAuth).

## Packages

| Package | Path | Description |
|---|---|---|
| `@repull/sdk` | `packages/sdk` | Hand-written ergonomic facade. `new Repull({ apiKey })`. |
| `@repull/types` | `packages/types` | Pure types regenerated from `openapi.json`. |
| `@repull/demo` | `apps/demo` | Polished demo app — flagship Airbnb OAuth Connect flow. Deployed to Vercel. |
| `@repull/channel-manager` | `apps/channel-manager` | Skeletal forkable starter for "build your own channel manager". Stubs only. |

## Quick start

```ts
import { Repull } from '@repull/sdk';

const repull = new Repull({ apiKey: process.env.REPULL_API_KEY! });

// Health
const health = await repull.health.check();

// Mint an Airbnb OAuth Connect session
const session = await repull.connect.airbnb.create({
  redirectUrl: 'https://yourapp.com/airbnb/return',
  // accessType is one of:
  //   'full_access'  — full host scopes (default): calendar, listings, reservations, messaging, property management
  //   'read_only'    — calendar-only OAuth scopes
  //   'messaging'    — read + send guest messages, no property management. Use this when the
  //                    customer already syncs the Airbnb account to another PMS — it coexists
  //                    with the incumbent app's property_management connection.
  accessType: 'full_access',
});
// -> { oauthUrl, sessionId, provider, expiresAt }
// Send the user to session.oauthUrl

// Poll status
const status = await repull.connect.airbnb.status();

// Mint a Booking.com Connect session
// Booking.com takes no accessType — just a redirectUrl. Same hosted-session
// response shape as Airbnb ({ url, sessionId, provider, expiresAt }). Send the
// user to session.url; they designate Repull in their Booking.com Extranet and
// paste their Hotel ID, then bounce back to redirectUrl.
const booking = await repull.connect.booking.create({
  redirectUrl: 'https://yourapp.com/booking/return',
});
// -> { url, sessionId, provider, expiresAt }
const bookingStatus = await repull.connect.booking.status();

// Reservations
const { data, pagination } = await repull.reservations.list({ limit: 50 });

// Properties — filter by the OTA/channel a property is published on.
// channel is one of 'airbnb' | 'booking' | 'vrbo'. Each Property also carries a
// `channels: string[]` listing every OTA it is actively published on.
const airbnbOnly = await repull.properties.list({ channel: 'airbnb' });
for (const p of airbnbOnly.data) {
  console.log(p.id, p.channels); // e.g. ['airbnb', 'booking']
}
```

## Local development

```bash
pnpm install
pnpm codegen           # snapshot openapi.json + regenerate @repull/types
pnpm build:packages    # build sdk + types
pnpm dev               # boot the demo on http://localhost:3001
```

## Demo app

The demo at `apps/demo` is the flagship surface. Its hero is the **Airbnb OAuth Connect flow** end-to-end against `api.repull.dev`. Open it, paste a Repull API key, click *Create connect session*, send yourself through the consent flow at `connect.repull.dev`, and come back to a live polling card showing your linked Airbnb account.

It also includes:
- Health pill (live)
- Reservations table (paginated, filterable)
- Properties list
- Airbnb listings panel with `connections` info
- Code panels showing the exact SDK call per section

Server-side proxy at `/api/repull-proxy` so API keys never ship in the client bundle.

## Channel-manager starter

`apps/channel-manager` is a separate Next 16 starter (deliberately stubbed for v1) that demonstrates the SDK as a fork-and-build entry point for someone shipping their own channel-manager product.

## License

This SDK is **NOT** MIT-licensed. See [`LICENSE.md`](./LICENSE.md). Free for personal use, research, evaluation, and operating against your own listings up to **100 active listings under management**. Commercial license required if you operate a service against third-party listings AND exceed 100 listings or $1M ARR derived from the SDK. Pattern modeled on Meta's Llama 3 Community License. See [`COMMERCIAL.md`](./COMMERCIAL.md) for the plain-English summary.

Inquiries: `hello@repull.dev`.

## Status & roadmap

This is **Phase A / MVP** from the SDK proposal. In scope today: SDK + demo with Connect / Reservations / Properties / Health / Airbnb listings. Out of scope (Phase B+): Booking/Plumguide/VRBO panels, AI streaming, webhook playground, `@repull/connect-react`, multi-language SDKs.

**Do not consider this production-ready.** API surface may break before v1.0.


