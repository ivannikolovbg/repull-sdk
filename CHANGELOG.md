# Changelog

All notable changes to `@repull/sdk` and `@repull/types` are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## v0.2.17 — 2026-09-23

Regenerated `@repull/types` against the live spec (199 → 202 operations, none
removed) and extended the facade to cover listing market state and
Booking.com unlist/relist. Purely additive.

### Added

- **`repull.listings.offline(id, { hotelId? })`** and
  **`repull.listings.online(id, { hotelId? })`** —
  `POST /v1/listings/{id}/offline|online`. Take a listing off sale, or put it
  back, on every connected channel in one call.

  This is **not** the same as deactivating a listing in Repull, and the two get
  confused because both sound like removal:

  | | `listings.offline(id)` | `listings.setActive(id, false)` |
  |---|---|---|
  | The guest-facing listing | **Stops taking bookings** | Stays live and keeps selling |
  | Billing and plan limits | Unchanged | No longer billed, no longer counts toward the cap |
  | API access to the listing | Unchanged | `403 listing_inactive` until reactivated |

  The answer is **per channel item**: a listing can sit on several Airbnb
  connections and a Booking.com property at once, they fail independently, and
  a partial result is the ordinary outcome — read each `channels[].ok`, not
  just the absence of a thrown error. `online` is not the mirror image of
  `offline`: it re-syncs the true calendar rather than opening everything, so
  genuinely blocked dates stay blocked. It also goes through the
  channel-publish gate, so on a lapsed subscription `offline` still works and
  `online` throws `402 payment_required`.
- **`repull.channels.booking.properties.unlist(id, { hotelId? })`**,
  **`.relist(id, { hotelId? })`** and the underlying **`.action(id, body)`** —
  `POST /v1/channels/booking/properties/{id}`, where `id` is a **Repull listing
  id**, not a Booking.com hotel id. Booking.com has no unlist, so this is an
  availability write. Pass `hotelId` when the listing maps to several
  Booking.com properties, or the call is refused with
  `409 ambiguous_booking_mapping` and nothing is written.
- **Types** — `ListingMarketStateRequest`, `ListingMarketStateResponse`,
  `ChannelMarketStateItem`, `BookingPropertyActionRequest`,
  `BookingPropertyActionResponse` and `BookingPublishResult` are now exported
  as convenience aliases from `@repull/types` and re-exported from
  `@repull/sdk`.
- **Generated surface** (`@repull/types`) — `POST /v1/channels/booking/setup`
  gains the `create-property`, `add-room`, `add-unit` and `advance` actions;
  `ListingCreateRequest` gains `roomTypeCategory`, `propertyTypeCategory` and
  `postalCode`; `ListingContentUpdateRequest.address` gains `state` and
  `postalCode`; `ListingPublishStatusChannel` gains `pushError`;
  `ListingPublishStatusConnection` gains `lockedFields`;
  `ListingPublishStatusResponse` gains `addressReadiness`;
  `AirbnbPublishResult` gains `live` and `warnings`; the error envelope gains
  `previous_code`.

### Changed

- `ListingPublishResponse` is now `ListingPublishBookingResponse` (the type
  behind `POST /v1/listings/{id}/publish/booking`); the old name is gone.

## v0.2.16 — 2026-09-22

Regenerated `@repull/types` against the live spec (191 → 199 operations, none
removed) and extended the facade to cover Airbnb inquiries, pre-approvals,
special offers, booking-request accept/decline and message attachments.
Purely additive.

### Added

- **`repull.inquiries.list({ status?, listing_id?, conversation_id?, limit?, cursor? })`** —
  `GET /v1/inquiries`. `status` defaults to `open` server-side; pass `'all'`
  for every state.
- **`repull.conversations.preApprove(id, { blockInstantBooking? })`** —
  `POST /v1/conversations/{id}/pre-approval`. Read `expiresAt` for when the
  pre-approval lapses.
- **`repull.conversations.specialOffers.create / get / withdraw`** —
  `POST /v1/conversations/{id}/special-offers`, `GET`/`DELETE
  .../special-offers/{offerId}`. `totalPrice` is the whole-stay total in the
  listing's Airbnb currency.
- **`repull.channels.airbnb.offers.get(offerId)`** —
  `GET /v1/channels/airbnb/offers?offerId=`, a live Airbnb read by Airbnb id.
- **`repull.reservations.accept(id)` / `repull.reservations.decline(id, { reason, message })`** —
  `POST /v1/reservations/{id}/accept|decline` for a pending Airbnb booking
  request (`status: 'pending'`, answer before `respondBy`).
- **`attachments` on `repull.conversations.send`** — up to 5 files by public
  `https://` URL. Per-channel limits are documented on `SendMessageRequest`.
- **Types**: `Inquiry`, `InquiryListResponse`, `ConversationPreApproval(Request)`,
  `SpecialOffer`, `SpecialOfferCreateRequest`, `SpecialOfferWithdrawResponse`,
  `AirbnbOffer`, `ReservationDeclineRequest`, `ReservationRequestResponse`,
  `SendMessageAttachment`, `SentAttachment`, `WebhookEvent`, `WebhookEventType`,
  `InquiryWebhookObject`, and the new webhook envelopes `InquiryCreatedEvent`,
  `InquiryUpdatedEvent`, `ReservationRequestCreatedEvent`,
  `ReservationRequestUpdatedEvent` (`inquiry.created/updated`,
  `reservation.request.created/updated`).
- `Reservation` gains `statusDetail` (`request_expired`) and `respondBy`.

## v0.2.15 — 2026-09-18

Regenerated `@repull/types` against the live spec (175 → 191 operations, none
removed) and extended the hand-written facade to cover the new Airbnb listing
content surface. Purely additive — nothing was renamed or removed.

### Added

- **`repull.listings.pullFromAirbnb(id, { airbnbConnectionId? })`** —
  `POST /v1/listings/{id}/pull/airbnb`. Reads the listing back off Airbnb and
  rewrites our stored copy from that answer. Read `refreshedFromChannel`:
  `false` means Airbnb could not be read this time and the projection ran off
  the copy we already held. `sections` lists what changed; rate-limited per
  listing, so calling again before `nextPullAvailableAt` throws a 429.
- **`repull.channels.airbnb.listings.bookingSettings.get / update`** —
  `GET`/`PUT .../booking-settings`. Instant Book, check-in/check-out windows,
  advance notice, and the cancellation policy including the non-refundable
  option. The update is partial; an unknown field is refused with `422` rather
  than silently dropped. The response's `applied` names the upstream groups
  actually written.
- **`repull.channels.airbnb.listings.details.get / update`** —
  `GET`/`PUT .../details`. Property type, room type, quiet hours, check-in
  method. The read carries `lockedFields`: the attributes Airbnb manages on an
  established listing and will not let you change.
- **`repull.channels.airbnb.listings.descriptions.list / update`** —
  `GET`/`PUT .../descriptions`. Airbnb keeps a separate description per locale,
  so `locale` is required on the write.
- **`repull.channels.airbnb.listings.photos.update / order / setCover`** —
  `PATCH .../photos`, `PUT .../photos/order`, `PUT .../photos/cover`, plus
  `photos.list`. `sortOrder` is a relative sort key, not an address, so a
  reorder response includes photos you did not name.
- **`repull.channels.airbnb.listings.rooms.list / update`** —
  `GET`/`PUT .../rooms`. `roomId` goes on the query string, as the API declares
  it; `beds` REPLACES the room's whole sleeping arrangement.
- **`repull.channels.airbnb.listings.amenities.list / update`** —
  `GET`/`PUT .../amenities`. Every entry needs `is_present`, so an amenity can
  never be a silent no-op.
- **`repull.channels.airbnb.listings.permits.list / update`** —
  `GET`/`PUT .../permits`. Pass `{ source: 'live' }` on the read: Airbnb
  refuses a `question_key` it did not ask for on this listing.
- **`repull.channels.airbnb.listings.safetyDisclosures.list / update`** —
  `GET`/`PUT .../safety-disclosures`. The write is a MERGE: a type you leave
  out keeps its value, and you retract a disclosure by sending `value: false`.
- **`repull.channels.airbnb.alterations.cancel(id)`** —
  `POST /v1/channels/airbnb/alterations/{id}/cancel`, to withdraw an alteration
  you raised yourself.
- New `@repull/types` aliases for all of the above, plus `AirbnbPhotoPosition`,
  `AirbnbSafetyDisclosure`, `AirbnbContentWriteResponse`, `AirbnbListingDetails`,
  `ListingPullAirbnbRequest` and `ListingPullResponse`. `operations` is now
  re-exported from `@repull/types` alongside `components` and `paths` — the
  Airbnb content surface is declared inline in the spec, so these aliases are
  derived from the generated `operations` map rather than hand-written.

### Changed

- **`listings.list` and `channels.airbnb.listings.list` now take `include`** —
  the facade never exposed the parameter before. `thumbnail` is newly supported
  by the API on both (it guarantees `thumbnailUrl` on every row, and on
  `/v1/listings` it is the only expansion that applies to inactive listings);
  `content` / `details` and `amenities` respectively were already there.
- **`channels.airbnb.listings.list` now takes `account_id`** — scope the read to
  one connected Airbnb account (the host id from
  `connect.airbnb.status().accounts[].externalAccountId`). With it,
  `dataFreshness.accounts[]` holds exactly that account. Again an existing API
  parameter the facade did not surface.
- `AirbnbConnection` gains `syncCategory` (`sync_all` /
  `sync_rates_and_availability` / `none`), `writable`, `lockedFields`,
  `accountId`, `accountName` and `hostName`. Airbnb authorises sync one listing
  at a time, so a connected account can still hold listings it will not accept
  writes for — `none` means every write is refused with
  `403 listing_not_api_connected`.
- `AirbnbDataFreshness` gains `accounts[]`, a per-account verdict. With several
  connected accounts, one disconnected host no longer condemns the other's rows:
  `stale` stays `false` and `reason` becomes `partial_account_staleness`.
- `Reservation` gains stay terms — `checkInTime` / `checkOutTime`, local `HH:MM`
  in the property's own timezone, on both the REST reads and the webhook
  payloads.
- New error code `listing_not_api_connected` (403), declared on the Airbnb write
  routes and carried through the existing `RepullError.code`. The Airbnb
  failure codes `airbnb_rejected`, `connection_reauth_required` and
  `airbnb_rate_limited` now cover the content routes too.
- `AirbnbPublishResult` is now a typed result carrying `published`, `sections`,
  `lockedFields`, `errors` and `reason`.

### Note on content writes

A `200` from the content endpoints is **not** proof the change landed: Airbnb
locks host-managed fields on established listings and answers 200 while applying
nothing for them. `details` and `descriptions` return `blockedFields` (`[]` is
what a landed write looks like); the others return `stored`, which says whether
our own copy was brought in line.

## v0.2.14 — 2026-09-15

Regenerated `@repull/types` against the live spec (174 → 175 operations) and
updated the hand-written facade to match.

### Added

- **`repull.listings.setStatus({ listingIds, active })`** — `POST /v1/listings/status`,
  activate or deactivate up to 500 listings in one all-or-nothing call. Returns
  `{ active, updated, unchanged }` (`ListingStatusBatchResponse`).
- **`disconnect({ accountId })`** on `connect.airbnb`, `connect.booking`,
  `connect.vrbo`, `connect.plumguide`, and `connect.disconnect(provider, { accountId })`
  — sent as the `accountId` query param to `DELETE /v1/connect/{provider}`. Required
  when a workspace has more than one account for the provider. Now typed as
  `ConnectDisconnectResponse` (`{ disconnected, provider, accountId, listingsDeactivated }`)
  instead of `unknown`. The disconnected account's listings are deactivated, not deleted.
- **`ConnectStatus.accounts[]`** (`ConnectAccount`) — every Airbnb account the workspace
  has connected; pass `externalAccountId` as `accountId` to disconnect one.
- **`RepullError.listingIds`** — populated on the new `403 listing_inactive` error, which
  83 operations now declare (`components.responses.ListingInactive`).
- New `@repull/types` aliases: `ListingStatusBatchRequest`, `ListingStatusBatchResponse`,
  `ConnectDisconnectResponse`, `ConnectAccount`.

### Changed

- **`connect.airbnb.create()` no longer sends `accessType: 'full_access'` when you omit
  it.** The API now locks the consent screen to whatever tier is sent, so the old
  default silently took the tier choice away from the host. Pass `accessType`
  explicitly to keep the previous behaviour.
- **Lists default to active listings.** `listings.list` accepts
  `status: 'active' | 'inactive' | 'archived' | 'all'` and `properties.list` accepts
  `status: 'active' | 'inactive' | 'all'`. Inactive rows carry identity fields only,
  and reading or writing an inactive listing returns `403 listing_inactive`.
- **Airbnb calendar writes** (`PUT /v1/channels/airbnb/listings/{id}/pricing` and
  `/availability`) gain `busy_subtype`, stricter validation (unknown fields such as
  `price` instead of `daily_price` are refused with `422 invalid_params`), and new
  error responses: `422 airbnb_rejected`, `403 connection_reauth_required`,
  `429 airbnb_rate_limited`.

### Deprecated

- Booking.com webhooks endpoints (`GET`/`POST`/`DELETE /v1/channels/booking/webhooks`)
  are deprecated and always return `403`.

## v0.2.13 — 2026-09-11

### Fixed

**Nineteen schema corrections landed on the live spec. `@repull/types` was
regenerated and one hand-written facade signature was wrong.**

Not one path or method moved — the API is still 124 paths / 174 operations —
so the old spec-freshness check printed OK straight through it while the
committed snapshot went stale. Only the shapes changed:

- **Ten fields renamed to camelCase.** The API serializer camelCases every
  key on the way out, so the spec had been declaring names the API can never
  return: `data_freshness` → `dataFreshness`, `last_synced_at` →
  `lastSyncedAt`, `fix_url` → `fixUrl`, `next_cursor` → `nextCursor`,
  `has_more` → `hasMore`, `monthly_requests` → `monthlyRequests`,
  `daily_ai_requests` → `dailyAiRequests`, `daily_ai` → `dailyAi`,
  `dynamic_pricing_listings` → `dynamicPricingListings`, `resets_at` →
  `resetsAt`.
- **Three list responses are bare arrays**, not `{ data, pagination }`:
  `BookingPropertyListResponse`, `BookingConversationListResponse`,
  `VrboListingListResponse`.
- **Four id fields are `string`, not `integer`** — the serializer stringifies
  every id key: `AirbnbAlteration.id`, `AirbnbAlteration.reservationId`,
  `AirbnbConnection.id`, `AirbnbListing.listingId`.
- **`Property.latitude` / `Property.longitude` are `string`, not `number`.**

### Changed

- **`repull.channels.airbnb.listings.list()` now returns
  `AirbnbListingListResponse` instead of `ListResponse<unknown>`.** The old
  signature was wrong in two ways: it typed the rows as `unknown`, and it
  dropped `dataFreshness` entirely — a field the API marks required on this
  endpoint. That endpoint is a pure read of the local Airbnb mirror and never
  calls Airbnb upstream, so `dataFreshness` is how you tell "this column is
  genuinely null" from "this workspace hasn't synced". Check
  `dataFreshness.stale`; when it is `true`, `dataFreshness.reason` says why
  (`never_synced`, `host_disconnected_since_<iso>`, `sync_lag_>_24h`) and
  `dataFreshness.fixUrl` is the dashboard screen that resolves it.
- **`repull.channels.airbnb.listings.get(id)` now returns `AirbnbListing`
  instead of `unknown`.**
- New `@repull/types` aliases: `AirbnbListing`, `AirbnbConnection`,
  `AirbnbDataFreshness`, `AirbnbListingListResponse`.

Nothing was removed: 227 schemas and 174 operations before and after, with
zero schema names added or dropped.

## v0.2.12 — 2026-09-11

### Added

The API gained four write operations as new methods on paths that already
existed for `GET`, so the path count is unchanged at 124 and only the
operation count moved (170 → 174). `@repull/types` was regenerated and the
hand-written facade gained a method for each:

- `repull.guests.create(body, { idempotencyKey })` — `POST /v1/guests`. Only `firstName` is required. The API matches on email/phone plus name before writing, so read `created` on the response rather than assuming a 2xx means a new record.
- `repull.reservations.create(body, { idempotencyKey })` — `POST /v1/reservations`. `platform` is limited to `direct` / `website` / `owner`; OTA reservations are owned by the channel and arrive through sync. The stay is priced by the pricing engine, not from the request.
- `repull.reservations.update(id, body, { idempotencyKey })` — `PATCH /v1/reservations/{id}`. Dates, times, guest count and a property move. A move combined with new dates is applied as ONE move so the access code is re-issued once, and it forces a confirmed `status` — read `changed` and `status` back.
- `repull.conversations.send(id, body, { idempotencyKey })` — `POST /v1/conversations/{id}/messages`. Omit `channel` to send on whichever channel the thread already uses. Check `contentRewritten`: when `true`, the channel altered the text (Airbnb strips links, emails and phone numbers) and the guest received `deliveredContent`, not `submittedContent`.

All three creating calls accept an `Idempotency-Key`, passed as
`opts.idempotencyKey`. Send a unique string per distinct request: a repeat
with the same key replays the stored response for 24 hours, a reuse with a
changed payload returns `422 idempotency_key_reused`, and a reuse while the
first request is still in flight returns `409 idempotency_key_in_use`.

New `@repull/types` aliases: `GuestCreateRequest`, `GuestCreateResponse`,
`ReservationCreateRequest`, `ReservationCreateResponse`,
`ReservationUpdateRequest`, `ReservationUpdateResponse`,
`ReservationGuestInput`, `SendMessageRequest`, `SendMessageResponse`.

## v0.2.11 — 2026-09-11

### Removed

- **Repull Studio namespace deleted from `@repull/sdk`.** `repull.studio.*` (added in v0.2.1) is gone — all ten `/api/studio/*` operations 404 on `api.repull.dev`; Studio now lives on its own infrastructure, not the public API. Types (`StudioProject`, `StudioFile`, `StudioGeneration`, `StudioDeployment`, `StudioError`) were also dropped from `@repull/types` — they'd become orphaned schema components (unreferenced by any path) once the spec's `/api/studio/*` paths were removed upstream.
- Four stub operations that previously advertised as reachable but only ever returned `501`/`404` (`POST /v1/ai`, `POST /v1/channels/airbnb/sync`, `POST /v1/channels/booking/sync`, `GET /v1/channels/vrbo/listings/{id}/pricing`) are gone from `@repull/types` — they were removed from the live spec, not just fixed.

### Added

Regenerated `@repull/types` from the live spec (89 → 124 tracked paths); 49 previously-undeclared operations are now typed, including:
- Airbnb: alterations (`accept`/`decline`), listing map/amenities/checkin-checkout guides/descriptions/quality/rooms/settings, messaging thread + message detail, offers, transactions.
- Booking.com: charges, property detail + rooms, reservations, setup, webhooks.
- Plumguide: bookings, webhooks.
- Direct-credential PMS connect for ten providers (`beds24`, `bookingsync`, `guesty`, `hospitable`, `hostaway`, `igms`, `lodgify`, `ownerrez`, `smoobu`, `vrbo`) and the Booking.com hosted-connect callback.
- Health: `/v1/health/{atlas,auth,mcp,webhooks}`, `/v1/health/channels/{channel}`.
- Listings: content, photos (list + upload-url).
- `POST /v1/availability/batch`, `GET /v1/quotes`, `POST /v1/reviews/{id}/reply`, `/v1/usage/{logs,summary,tier}`.

### Fixed

- Removed a stray `POST /v1/channels/airbnb/sync` "Bulk sync" placeholder card from the `channel-manager` demo app — that endpoint no longer exists in the API.

### Notes

- Regenerated via `pnpm codegen` (`scripts/pull-openapi.ts` + `openapi-typescript`) against `https://api.repull.dev/openapi.json`.
- Two spec defects were found and fixed upstream (prepared on `vanio-repull-api` branch `fix/reviews-reply-path-param`, not yet merged/deployed at the time of this release): (1) `POST /v1/reviews/{id}/reply` was missing its `{id}` path-parameter declaration, which fails `openapi-typescript`'s `$ref`/path validation outright; (2) 14 operations' `422` responses referenced a non-existent `#/components/responses/ValidationError` (should be `UnprocessableEntity`), a dangling `$ref` that also hard-fails codegen. This release's `openapi/v1.json` is untouched and matches the live spec byte-for-byte; `src/openapi.ts` was generated from a locally-patched copy carrying both corrections so the SDK types compile cleanly today, ahead of the upstream fix landing.

## v0.2.10 — 2026-07-26

### Added

- **Listing activation controls.** `listings.delete(id)` deactivates (excludes) a listing via `DELETE /v1/listings/{id}` — a soft toggle that frees a slot against the plan's active-listing cap, not a hard delete. `listings.setActive(id, active)` (and its `listings.update(id, { active })` alias) toggle the state via `PATCH /v1/listings/{id}`; reactivating (`active: true`) may throw `402` when it would exceed the tier cap. Both return the resulting `{ id, active }` (`ListingActiveResponse`). New `ListingActiveRequest` / `ListingActiveResponse` types exported from `@repull/types`. `POST /v1/listings` now also declares a `402` response. Regenerated `@repull/types` from the live OpenAPI spec.

## v0.2.8 — 2026-06-25

### Added

- **Dedicated Booking.com Connect namespace.** `connect.booking` is now a first-class namespace (`BookingConnectNamespace`) mirroring `connect.airbnb`. Call `connect.booking.create({ redirectUrl })` to mint a hosted Connect session (`POST /v1/connect/booking`) returning `{ url, sessionId, provider, expiresAt }` — send the user to `url` to designate Repull in their Booking.com Extranet and paste their Hotel ID. Unlike Airbnb, Booking.com takes no `accessType`. `connect.booking.status()` and `connect.booking.disconnect()` are also available.
- **`channel` filter on `properties.list(...)`.** Pass `channel: 'airbnb' | 'booking' | 'vrbo'` to `properties.list(...)` to filter to properties published on a given OTA.
- **`channels: string[]` on `Property`.** Each property now reports the OTAs/channels it is actively published on. Regenerated `@repull/types` from the live OpenAPI spec.

## v0.2.7 — 2026-06-24

### Added

- **`messaging` Airbnb Connect access scope.** `AirbnbAccessType` is now `'read_only' | 'full_access' | 'messaging'`. Pass `accessType: 'messaging'` to `connect.airbnb(...)` to request read + send-guest-message scopes only, without Airbnb's exclusive `property_management` scope — so the connection coexists with an account already linked to another PMS. Regenerated `@repull/types` from the live OpenAPI spec.

## v0.2.6 — 2026-05-15

### Added

- **`PaymentRequired` (402) response component in `@repull/types`.** New `components.responses.PaymentRequired` surfaced via `openapi-typescript` regen. The API now returns `402 Payment Required` with `error.code = "listings_limit_exceeded"` when a customer is over their tier's active-listing cap (free=5, starter=50, custom=unlimited). Unlike 429, 402 is NOT a "wait and retry" condition — `Retry-After` is not set. Recovery: `DELETE` listings to fall under the cap, or upgrade at `repull.dev/dashboard/billing`. `/v1/health`, `/v1/usage/*`, and any `DELETE` are exempt. The 402 envelope mirrors `rate_limit_exceeded` and adds `tier`, `limit`, `active_listings`, `upgrade_url`. Tracks vanio-repull-api PR #66.

## v0.2.1 — 2026-05-04

### Added — Studio routes (16 ops)

Repull Studio is now reachable from the TypeScript SDK. The `Repull` client
gains a new `studio` namespace covering all 10 paths and 16 operations:

- `repull.studio.projects.list / create / get / update / delete`
- `repull.studio.projects.files.list / upsert / delete`
- `repull.studio.projects.generations.create`
- `repull.studio.generate(...)`
- `repull.studio.deployments.list / create / get / delete / suspend / wake`

New types in `@repull/types`: `StudioProject`, `StudioFile`,
`StudioGeneration`, `StudioDeployment`, `StudioError` (re-exported from
`./openapi`).

The 16 corresponding `operations[...]` shapes are emitted by
`openapi-typescript` straight from the merged spec. `User-Agent` bumped to
`@repull/sdk/0.2.1`.

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
