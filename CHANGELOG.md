# Changelog

All notable changes to `@repull/sdk` and `@repull/types` are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## v0.2.1 — 2026-05-03

### Added
- **Typed webhook event handling.** The OpenAPI spec now declares a discriminated `WebhookEvent` union (15 variants — one per canonical event type, keyed on `type`). The regenerated `@repull/types` exports `WebhookEvent`, `WebhookEventType`, and per-event payload + envelope schemas (`ReservationCreatedEvent`, `ConnectionDisconnectedEvent`, `PaymentCompletedPayload`, etc.). Endpoint handlers can now narrow `event.data` by switching on `event.type`:

  ```ts
  import type { components } from '@repull/types/openapi'
  type WebhookEvent = components['schemas']['WebhookEvent']

  function handle(event: WebhookEvent) {
    if (event.type === 'connection.disconnected') {
      // event.data.connectionId, event.data.provider, event.data.reason — all typed
    }
  }
  ```

- `WebhookSubscription.events`, the create/update bodies, and `test_fire_webhook` are now typed against `WebhookEventType` instead of bare `string`, so passing an unknown event id fails at compile time.

## v0.2.0 — 2026-05-02

MAJOR — canonical contract release. The api.repull.dev surface was unified end-to-end (camelCase fields, string IDs, single `{ data, pagination }` envelope, self-documenting errors, rate-limit headers). This SDK regen aligns the TypeScript types and the hand-written facade with that contract.

### Changed (breaking)
- **Pagination is canonical everywhere.** Every list endpoint now returns `{ data, pagination: { nextCursor, hasMore, total? } }`. The legacy `?offset=` walk was removed from `/v1/properties`, `/v1/reservations`, `/v1/usage-logs`, and the VRBO routes. `repull.properties.list({ offset })` and `repull.reservations.list({ offset })` no longer compile — pass `cursor: pagination.nextCursor` from the previous page instead.
- **All response field names are camelCase.** Every snake_case key flipped (`guest_id` → `guestId`, `last_message_at` → `lastMessageAt`, `unread_count` → `unreadCount`, `created_at` → `createdAt`, `next_cursor` → `nextCursor`, `has_more` → `hasMore`, etc). Query parameters retain their existing names (`check_in_after`, `listing_id`, etc) — only response payloads changed.
- **All ID fields are `string`.** `Listing.id`, `Property.id`, `Guest.id`, `Conversation.id`, `Reservation.id`, plus every foreign key (`listingId`, `guestId`, `reservationId`, `connectionId`, etc) are now string-typed. Numeric assignments will fail at compile time.
- **`POST /v1/connect/airbnb` response field rename**: `oauthUrl` → `url`. The hand-written `ConnectSession` type was updated to match — pass `session.url` to your redirect.
- **`/v1/markets` reshape**: per-city KPIs moved from `response.markets` to `response.data` (canonical envelope). Auxiliary fields (`totals`, `myListings`, `browse`, `freeMarket`, `subscriptions`, `tier`) are still siblings.
- **`/v1/markets/browse` field rename**: `pagination.total_in_filter` → `pagination.total`.
- **`/v1/reviews/{id}` envelope normalize**: now returns the bare `Review` object (the v0.1.x `{ data: Review }` wrapper was removed). `repull.reviews.get(id)` already typed it as `Review`; runtime now matches.
- **`/v1/channels/airbnb/listings` envelope**: now wraps in `{ data, pagination }` (matches the existing OpenAPI declaration). The hand-written facade typed it as `unknown` previously; it's now `ListResponse<unknown>`.
- `CursorListResponse` and `ReservationListResponse` are deprecated aliases for `ListResponse`. `CursorPagination` and `ReservationPagination` are deprecated aliases for `Pagination`. They keep v0.1.x imports compiling but will be removed in a future major.
- `ConnectStatus.id` is now `string` (was `number`).

### Added
- **New top-level `repull.listings.list / get`.** v0.1.x only exposed `repull.listings.pricing` — the `GET /v1/listings` and `GET /v1/listings/{id}` routes had no facade. They now have one, with the full filter set (`q`, `status`, `channel`, `cursor`, `limit`, `include_total`) and `xSchema` support.
- **`repull.markets.browse(query)`** — paginated `/v1/markets/browse` discovery catalog (`q`, `country`, `sort`, `cursor`, `limit`, `include_total`).
- **Self-documenting error envelope on every 4xx/5xx.** `RepullError` now exposes `fix`, `docsUrl`, `field`, `valueReceived`, `validValues`, `validParams`, `endpoint`, `didYouMean`, `retryAfter` in addition to the existing `code`, `message`, `requestId`. AI agents and humans can recover without a docs round-trip — surface `error.fix` verbatim.
- **Rate-limit headers + 429 response with `Retry-After`.** The SDK retry loop already honored `Retry-After`; the new error envelope surfaces `retryAfter` as a number on `RepullRateLimitError` for app-level handling.
- **`?include_total=true` opt-in.** Pass `include_total: true` (or `false`) on any list endpoint to control whether `pagination.total` is computed (default behavior varies per endpoint — see docs). All list method signatures now accept `include_total?: boolean`.
- **API key prefix format.** Fresh keys are `sk_test_*` / `sk_live_*`; legacy bare-hex keys still validate. The SDK accepts both.
- **`pagination.total` on every list endpoint.** Was endpoint-specific in v0.1.x; now uniform.
- **Strict query param validation.** Unknown params now return 422 with `did_you_mean` + `validParams`. The SDK surfaces them on `RepullValidationError.didYouMean` / `.validParams`.
- New types re-exported from `@repull/types`: `Listing`, `ListingChannel`, `MarketBrowseResponse`, `MarketBrowseEntry`, `MarketBrowseFeatured`, `MarketBrowseCategory`, `MarketMyListing`. The new `ListResponse<T>` is the canonical list shape.

### Migration

```ts
// v0.1.x
const res = await repull.reservations.list({ limit: 50, offset: 100 });
res.data.forEach((r) => console.log(r.id /* number */, r.guest_id /* snake */));

// v0.2.0
const res = await repull.reservations.list({ limit: 50, cursor });
res.data.forEach((r) => console.log(r.id /* string */, r.guestId /* camel */));
const next = res.pagination.nextCursor;
if (res.pagination.hasMore) {
  await repull.reservations.list({ limit: 50, cursor: next });
}

// v0.2.0 — Airbnb Connect
const session = await repull.connect.airbnb.create({ redirectUrl, accessType: 'full_access' });
window.location.href = session.url; // was session.oauthUrl

// v0.2.0 — Markets
const res = await repull.markets.list();
res.data.forEach((m) => console.log(m.city)); // was res.markets

// v0.2.0 — Listings (NEW)
const listings = await repull.listings.list({ limit: 50, q: 'Sable' });
const one = await repull.listings.get('4118');
```

## v0.1.2 — 2026-05-02

Add custom-schema CRUD endpoints + `X-Schema` header on all read endpoints. Fix `Reservation` type drift (breaking).

### Added
- `repull.schemas.list / get / create / update / delete` — full CRUD over `/v1/schema/custom` for workspace-scoped field-mapping schemas (`createCustomSchema`, `listCustomSchemas`, `getCustomSchema`, `updateCustomSchema`, `deleteCustomSchema`).
- `xSchema` per-call option on every read method (`reservations.list/get`, `conversations.list/get/messages`, `guests.list/get`, `reviews.list/get`) — forwards as the `X-Schema: <name>` request header.
- New types re-exported from `@repull/types`: `CustomSchema`, `CustomSchemaSummary`, `CustomSchemaCreate`, `CustomSchemaCreateResponse`, `CustomSchemaUpdate`, `CustomSchemaListResponse`, `CustomSchemaDeleteResponse`, `CustomSchemaMappings`.

### Changed (breaking — types only)
- `Reservation` shape now matches what `api.repull.dev` actually returns. Removed phantom fields: `propertyId`, `guestFirstName`, `guestLastName`, `guestEmail`, `guestPhone`, `guestCount`, `provider`. Real fields are `listingId`, `guestId`, `guestDetails`, `guestName`. Consumers depending on the old fields will see compile errors — that is intentional; the previous shape did not match runtime responses.

## v0.1.1

Adds `repull.conversations`, `repull.guests`, `repull.reviews` and migrates `repull.reservations.list()` to cursor pagination (legacy `?offset=` walk still works during the deprecation window).

## v0.1.0

Initial public release.
