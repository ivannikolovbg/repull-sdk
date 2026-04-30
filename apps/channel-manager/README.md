# `create-repull-channel-manager` (skeleton)

> **Status:** scaffold only. v0.1.0-alpha. Not a functional channel manager — yet.

This is the **starter shell** for building your own channel manager on top of Repull. It's intentionally minimal: a Next 16 app, the `@repull/sdk` wired in, the same auth bar pattern as the demo, and a two-column layout (Listings on the left, calendar/pricing placeholders on the right) ready for you to fill in.

## What it shows today

- `<RepullProvider apiKey={...}>` — the same auth pattern as the demo, adapted to a multi-page workspace.
- `repull.channels.airbnb.listings.list()` rendering on the left rail.
- Stub panels on the right marked "coming soon" for calendar, pricing, and messaging.

## How to fork it

```bash
npx degit ivannikolovbg/repull-sdk/apps/channel-manager my-channel-manager
cd my-channel-manager
pnpm install
pnpm dev    # http://localhost:3002
```

## What you'd build next

| Panel | Repull endpoint | SDK call |
|---|---|---|
| Calendar | `GET/PUT /v1/channels/airbnb/listings/{id}/availability` | `repull.channels.airbnb.listings...` (extend SDK) |
| Pricing | `GET/PUT /v1/channels/airbnb/listings/{id}/pricing` | (extend SDK) |
| Messaging | `GET/POST /v1/channels/airbnb/messaging/{threadId}/messages` | (extend SDK) |
| Bulk sync | `POST /v1/channels/airbnb/sync` | (extend SDK) |

The SDK at v0.1.0-alpha covers Connect / Reservations / Properties / Health / Airbnb listings (read). The endpoints above are documented in `openapi.json` — wire them through the same facade pattern in `packages/sdk/src/client.ts`.

## License

Same Repull SDK Community License as the rest of this monorepo. Free for personal use and for your own listings up to 100 active listings. Commercial license required at scale. See [`/LICENSE.md`](../../LICENSE.md) at the repo root.

Powered by Repull.
