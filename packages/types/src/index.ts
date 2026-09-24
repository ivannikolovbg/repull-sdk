// Public surface for @repull/types — re-exports the generated openapi types
// plus a small set of hand-curated convenience aliases.
//
// v0.2.0 — canonical shapes only:
//   - Pagination is always `{ nextCursor, hasMore, total? }` (camelCase).
//   - All ID fields are `string` (Listing.id, Property.id, Guest.id,
//     Reservation.id, foreign keys like listingId/guestId/reservationId).
//   - All field names are camelCase (no snake_case in response payloads).
//   - List responses always wrap in `{ data, pagination }` — no bespoke
//     shapes (`/v1/markets` no longer returns `markets`, /v1/reviews/{id}
//     no longer wraps in `{ data }`, etc.).

import type { components, operations, paths } from './openapi.js';

export type { components, operations, paths } from './openapi.js';

/** Convenience aliases over the generated `components.schemas`. */
export type Property = components['schemas']['Property'];
export type Reservation = components['schemas']['Reservation'];
export type Listing = components['schemas']['Listing'];
export type ListingChannel = components['schemas']['ListingChannel'];
export type ListingActiveRequest = components['schemas']['ListingActiveRequest'];
export type ListingActiveResponse = components['schemas']['ListingActiveResponse'];
/** Body of `POST /v1/listings/status` (bulk activate/deactivate, up to 500 ids). */
export type ListingStatusBatchRequest = components['schemas']['ListingStatusBatchRequest'];
/** Response of `POST /v1/listings/status` — `{ active, updated, unchanged }`. */
export type ListingStatusBatchResponse = components['schemas']['ListingStatusBatchResponse'];
/**
 * Body of `POST /v1/listings/{id}/online` and `.../offline` — optional
 * `hotelId` to disambiguate when the listing is mapped to several
 * Booking.com properties.
 */
export type ListingMarketStateRequest = components['schemas']['ListingMarketStateRequest'];
/**
 * Response of `POST /v1/listings/{id}/online` and `.../offline` —
 * `{ listingId, state, channels }`. Channels fail independently, so a partial
 * result is an ordinary outcome: check each item's `ok`.
 */
export type ListingMarketStateResponse = components['schemas']['ListingMarketStateResponse'];
/** One channel's outcome inside a `ListingMarketStateResponse`. */
export type ChannelMarketStateItem = components['schemas']['ChannelMarketStateItem'];
/** Body of `POST /v1/channels/booking/properties/{id}` — `unlist` / `relist`. */
export type BookingPropertyActionRequest = components['schemas']['BookingPropertyActionRequest'];
/** Response of `POST /v1/channels/booking/properties/{id}`. */
export type BookingPropertyActionResponse =
  components['schemas']['BookingPropertyActionResponse'];
/** Booking.com half of a publish result. */
export type BookingPublishResult = components['schemas']['BookingPublishResult'];
/**
 * `DELETE /v1/connect/{provider}` response —
 * `{ disconnected, provider, accountId, listingsDeactivated }`.
 */
export type ConnectDisconnectResponse =
  paths['/v1/connect/{provider}']['delete']['responses'][200]['content']['application/json'];
export type Guest = components['schemas']['Guest'];
export type CalendarDay = components['schemas']['CalendarDay'];
export type Conversation = components['schemas']['Conversation'];
export type Message = components['schemas']['Message'];
export type Connection = components['schemas']['Connection'];
export type WebhookSubscription = components['schemas']['WebhookSubscription'];
export type AIOperation = components['schemas']['AIOperation'];
export type RepullErrorPayload = components['schemas']['Error'];
export type Review = components['schemas']['Review'];

/**
 * A Vanio listing paired with its Airbnb connection rows. Returned by
 * `GET /v1/channels/airbnb/listings/{id}` and as the element type of
 * {@link AirbnbListingListResponse}.
 */
export type AirbnbListing = components['schemas']['AirbnbListing'];
/** One `listings_airbnb` row under {@link AirbnbListing.connections}. */
export type AirbnbConnection = components['schemas']['AirbnbConnection'];
/**
 * Freshness indicator carried by every DB-backed Airbnb read. Tells you WHY a
 * column may be null or stale without per-row error envelopes — the endpoint
 * always returns 200 + whatever the local mirror holds. Read `stale` first;
 * when it is `true`, `reason` says why and `fixUrl` is the dashboard screen
 * that resolves it (typically Airbnb reconnect).
 */
export type AirbnbDataFreshness = components['schemas']['AirbnbDataFreshness'];
/**
 * Returned by `GET /v1/channels/airbnb/listings`. The canonical
 * `{ data, pagination }` envelope plus a required `dataFreshness` — this
 * endpoint reads the local Airbnb mirror, never Airbnb upstream, so the
 * freshness signal is part of the response contract rather than an extra.
 */
export type AirbnbListingListResponse = components['schemas']['AirbnbListingListResponse'];

// --- Airbnb listing content (v0.2.15) -------------------------------------
//
// The Airbnb content surface is largely declared inline in the spec rather
// than as named `components.schemas`, so these aliases are derived from the
// generated `operations` map. That keeps them exactly what the API declares
// — nothing here is hand-written.
//
// Every write answers with a `stored` flag (was our own copy brought in line)
// or, for the two `AirbnbContentWriteResponse` routes, with `blockedFields`.
// A 200 is NOT proof the change landed: Airbnb locks host-managed fields on
// established listings and answers 200 while applying nothing for them.

/** `GET /v1/channels/airbnb/listings/{id}/booking-settings`. */
export type AirbnbBookingSettingsResult =
  operations['get_airbnb_booking_settings']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../booking-settings`. Partial — unknown fields are refused with 422. */
export type AirbnbBookingSettingsUpdateRequest =
  NonNullable<operations['update_airbnb_booking_settings']['requestBody']>['content']['application/json'];
/** Returned by `PUT .../booking-settings`. `applied` names the upstream groups written. */
export type AirbnbBookingSettingsUpdateResult =
  operations['update_airbnb_booking_settings']['responses'][200]['content']['application/json'];

/** `GET /v1/channels/airbnb/listings/{id}/details`. */
export type AirbnbListingDetailsResult =
  operations['getAirbnbListingDetails']['responses'][200]['content']['application/json'];
/** The details payload itself — carries `lockedFields`, the attributes Airbnb will not let you change. */
export type AirbnbListingDetails = components['schemas']['AirbnbListingDetailsResponse'];
/** Request body for `PUT .../details`. */
export type AirbnbListingDetailsWriteRequest =
  components['schemas']['AirbnbListingDetailsWriteRequest'];
/**
 * Result of a content write (`PUT .../details`, `PUT .../descriptions`).
 * Read `blockedFields`: `[]` is what a landed write looks like.
 */
export type AirbnbContentWriteResponse = components['schemas']['AirbnbContentWriteResponse'];

/** `GET /v1/channels/airbnb/listings/{id}/permits`. */
export type AirbnbPermitsResult =
  operations['listAirbnbListingPermits']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../permits`. */
export type AirbnbPermitsWriteRequest = components['schemas']['AirbnbPermitsWriteRequest'];
/** Returned by `PUT .../permits`. */
export type AirbnbPermitsWriteResult =
  operations['updateAirbnbListingPermits']['responses'][200]['content']['application/json'];

/** `GET /v1/channels/airbnb/listings/{id}/safety-disclosures`. */
export type AirbnbSafetyDisclosuresResult =
  operations['listAirbnbListingSafetyDisclosures']['responses'][200]['content']['application/json'];
/** One guest-safety disclosure. */
export type AirbnbSafetyDisclosure = components['schemas']['AirbnbSafetyDisclosure'];
/** Request body for `PUT .../safety-disclosures`. A MERGE — omit a type to leave it alone. */
export type AirbnbSafetyDisclosuresWriteRequest =
  components['schemas']['AirbnbSafetyDisclosuresWriteRequest'];
/** Returned by `PUT .../safety-disclosures`. */
export type AirbnbSafetyDisclosuresWriteResult =
  operations['updateAirbnbListingSafetyDisclosures']['responses'][200]['content']['application/json'];

/** `GET /v1/channels/airbnb/listings/{id}/descriptions`. */
export type AirbnbDescriptionsResult =
  operations['list_airbnb_listing_descriptions']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../descriptions` — one locale's copy. */
export type AirbnbDescriptionWriteRequest = components['schemas']['AirbnbDescriptionWriteRequest'];

/** Request body for `PATCH /v1/channels/airbnb/listings/{id}/photos`. */
export type AirbnbPhotoUpdateRequest =
  NonNullable<operations['update_airbnb_listing_photo']['requestBody']>['content']['application/json'];
/** Returned by `PATCH .../photos`. */
export type AirbnbPhotoUpdateResult =
  operations['update_airbnb_listing_photo']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../photos/order` — every id in display order. */
export type AirbnbPhotoOrderRequest =
  NonNullable<operations['reorder_airbnb_listing_photos']['requestBody']>['content']['application/json'];
/** Returned by `PUT .../photos/order`. */
export type AirbnbPhotoOrderResult =
  operations['reorder_airbnb_listing_photos']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../photos/cover`. */
export type AirbnbPhotoCoverRequest =
  NonNullable<operations['set_airbnb_listing_cover_photo']['requestBody']>['content']['application/json'];
/** Returned by `PUT .../photos/cover`. */
export type AirbnbPhotoCoverResult =
  operations['set_airbnb_listing_cover_photo']['responses'][200]['content']['application/json'];
/** One photo's position in the tour. `sortOrder` is a relative sort key, not an address. */
export type AirbnbPhotoPosition = components['schemas']['AirbnbPhotoPosition'];

/** `GET /v1/channels/airbnb/listings/{id}/rooms`. */
export type AirbnbRoomsResult =
  operations['list_airbnb_listing_rooms']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../rooms` — `beds` REPLACES the room's arrangement. */
export type AirbnbRoomUpdateRequest =
  NonNullable<operations['update_airbnb_listing_room']['requestBody']>['content']['application/json'];
/** Returned by `PUT .../rooms`. */
export type AirbnbRoomUpdateResult =
  operations['update_airbnb_listing_room']['responses'][200]['content']['application/json'];

/** `GET /v1/channels/airbnb/listings/{id}/amenities`. */
export type AirbnbAmenitiesResult =
  operations['list_airbnb_listing_amenities']['responses'][200]['content']['application/json'];
/** Request body for `PUT .../amenities`. */
export type AirbnbAmenitiesUpdateRequest =
  NonNullable<operations['update_airbnb_listing_amenities']['requestBody']>['content']['application/json'];
/** Returned by `PUT .../amenities` — counts of what was written. */
export type AirbnbAmenitiesUpdateResult =
  operations['update_airbnb_listing_amenities']['responses'][200]['content']['application/json'];

/** Optional body for `POST /v1/listings/{id}/pull/airbnb`. */
export type ListingPullAirbnbRequest = components['schemas']['ListingPullAirbnbRequest'];
/**
 * Returned by `POST /v1/listings/{id}/pull/airbnb`. Read `refreshedFromChannel`:
 * `false` means Airbnb could not be read and the projection ran off the copy we
 * already held.
 */
export type ListingPullResponse = components['schemas']['ListingPullResponse'];

/** Request body for `POST /v1/guests`. */
export type GuestCreateRequest = components['schemas']['GuestCreateRequest'];
/** Returned by `POST /v1/guests`. Read `created` — a 2xx does not mean a new record. */
export type GuestCreateResponse = components['schemas']['GuestCreateResponse'];
/** Request body for `POST /v1/reservations`. */
export type ReservationCreateRequest = components['schemas']['ReservationCreateRequest'];
/** Returned by `POST /v1/reservations` (201). */
export type ReservationCreateResponse = components['schemas']['ReservationCreateResponse'];
/** Request body for `PATCH /v1/reservations/{id}`. At least one field is required. */
export type ReservationUpdateRequest = components['schemas']['ReservationUpdateRequest'];
/** Returned by `PATCH /v1/reservations/{id}`. `changed` lists the fields actually written. */
export type ReservationUpdateResponse = components['schemas']['ReservationUpdateResponse'];
/** Guest identity accepted inline by `POST /v1/reservations`. */
export type ReservationGuestInput = components['schemas']['ReservationGuestInput'];
/** Request body for `POST /v1/conversations/{id}/messages`. */
export type SendMessageRequest = components['schemas']['SendMessageRequest'];
/** Returned by `POST /v1/conversations/{id}/messages`. */
export type SendMessageResponse = components['schemas']['SendMessageResponse'];
/** One file in `SendMessageRequest.attachments` (up to 5 per message; per-channel limits apply). */
export type SendMessageAttachment = components['schemas']['SendMessageAttachment'];
/** One delivered file echoed back on `SendMessageResponse`. */
export type SentAttachment = components['schemas']['SentAttachment'];

/** Body of `POST /v1/conversations/{id}/pre-approval` (optional). */
export type ConversationPreApprovalRequest =
  NonNullable<operations['preapprove_conversation']['requestBody']>['content']['application/json'];
/** Returned by `POST /v1/conversations/{id}/pre-approval` (201). */
export type ConversationPreApproval =
  operations['preapprove_conversation']['responses'][201]['content']['application/json'];
/** Body of `POST /v1/conversations/{id}/special-offers`. */
export type SpecialOfferCreateRequest =
  operations['create_conversation_special_offer']['requestBody']['content']['application/json'];
/** A special offer — returned by create (201) and `GET /v1/conversations/{id}/special-offers/{offerId}`. */
export type SpecialOffer =
  operations['get_conversation_special_offer']['responses'][200]['content']['application/json'];
/** Returned by `DELETE /v1/conversations/{id}/special-offers/{offerId}`. */
export type SpecialOfferWithdrawResponse =
  operations['withdraw_conversation_special_offer']['responses'][200]['content']['application/json'];
/** Returned by `GET /v1/channels/airbnb/offers?offerId=` — a pre-approval or special offer read live from Airbnb. */
export type AirbnbOffer =
  operations['get_airbnb_offer']['responses'][200]['content']['application/json'];
/** Body of `POST /v1/reservations/{id}/decline`. */
export type ReservationDeclineRequest =
  operations['decline_reservation_request']['requestBody']['content']['application/json'];
/** Returned by `POST /v1/reservations/{id}/accept` and `/decline`. */
export type ReservationRequestResponse =
  operations['accept_reservation_request']['responses'][200]['content']['application/json'];
/** Returned by `GET /v1/inquiries`. */
export type InquiryListResponse =
  operations['list_inquiries']['responses'][200]['content']['application/json'];
/** One inquiry row from `GET /v1/inquiries`. */
export type Inquiry = InquiryListResponse['data'][number];

/** Every webhook event type the API can deliver. */
export type WebhookEventType = components['schemas']['WebhookEventType'];
/** Discriminated union of every webhook delivery envelope, keyed on `type`. */
export type WebhookEvent = components['schemas']['WebhookEvent'];
/** `data.object` of `inquiry.*` webhook events. */
export type InquiryWebhookObject = components['schemas']['InquiryWebhookObject'];
/** `inquiry.created` webhook delivery. */
export type InquiryCreatedEvent = components['schemas']['InquiryCreatedEvent'];
/** `inquiry.updated` webhook delivery. */
export type InquiryUpdatedEvent = components['schemas']['InquiryUpdatedEvent'];
/** `reservation.request.created` webhook delivery (a guest asked to book; accept or decline it). */
export type ReservationRequestCreatedEvent = components['schemas']['ReservationRequestCreatedEvent'];
/** `reservation.request.updated` webhook delivery (the request was accepted, declined or expired). */
export type ReservationRequestUpdatedEvent = components['schemas']['ReservationRequestUpdatedEvent'];

/**
 * Custom field-mapping schema. Reshapes the `native` response payload into
 * your app's preferred field names. Apply one per request via the
 * `X-Schema: <name>` header on any read endpoint.
 */
export type CustomSchema = components['schemas']['CustomSchema'];
/** Row shape returned by `GET /v1/schema/custom`. */
export type CustomSchemaSummary = components['schemas']['CustomSchemaSummary'];
/** Request body for `POST /v1/schema/custom`. */
export type CustomSchemaCreate = components['schemas']['CustomSchemaCreate'];
/** Returned by `POST /v1/schema/custom` (201). */
export type CustomSchemaCreateResponse = components['schemas']['CustomSchemaCreateResponse'];
/** Request body for `PATCH /v1/schema/custom/{id}`. `name` is intentionally not patchable. */
export type CustomSchemaUpdate = components['schemas']['CustomSchemaUpdate'];
/** Returned by `GET /v1/schema/custom`. */
export type CustomSchemaListResponse = components['schemas']['CustomSchemaListResponse'];
/** Returned by `DELETE /v1/schema/custom/{id}`. */
export type CustomSchemaDeleteResponse = components['schemas']['CustomSchemaDeleteResponse'];
/** Mappings object — keys are output field names, values are expressions over the native payload. */
export type CustomSchemaMappings = components['schemas']['CustomSchemaMappings'];

/**
 * Canonical cursor-based pagination envelope returned by EVERY list endpoint.
 *
 * Pass `nextCursor` back as `?cursor=<value>` to fetch the next page; stop
 * when `hasMore` is `false`. The cursor is opaque base64 — do not parse or
 * construct it by hand. `total` is included by default (omit
 * `?include_total=true` semantics live on each endpoint) and may be absent
 * on very large workspaces when `?include_total=false` is passed.
 */
export type Pagination = components['schemas']['Pagination'];
/** @deprecated Alias for {@link Pagination}. Removed in a future major. */
export type CursorPagination = components['schemas']['Pagination'];
/** @deprecated Alias for {@link Pagination}. Removed in a future major. */
export type ReservationPagination = components['schemas']['Pagination'];

/**
 * Connect session, returned by `POST /v1/connect/airbnb` (and other
 * single-provider Connect routes).
 *
 * v0.2.0 rename: `oauthUrl` → `url`. Send the user to `url` (hosted on
 * `connect.repull.dev`) and they bounce back to the `redirectUrl` you
 * supplied after consent.
 */
export interface ConnectSession {
  sessionId: string;
  /** Hosted URL to redirect the user to. Renamed from `oauthUrl` in v0.2.0. */
  url: string;
  provider: string;
  expiresAt: string;
}

/**
 * Multi-channel picker session, returned by `POST /v1/connect` (no provider).
 *
 * `url` points at the hosted picker on connect.repull.dev — the user picks
 * a channel, completes the per-pattern handoff, then bounces back to the
 * `redirectUrl` you supplied.
 */
export interface ConnectPickerSession {
  sessionId: string;
  url: string;
  expiresAt: string;
  /** Echo of the opaque `state` you passed in, or null. */
  state: string | null;
}

export type ConnectPattern = 'oauth' | 'credentials' | 'claim' | 'activation';
export type ConnectChannelCategory = 'ota' | 'pms';
export type ConnectChannelStatus = 'live' | 'beta' | 'coming_soon';

/** A single channel as returned by `GET /v1/connect/providers`. */
export interface ConnectProvider {
  id: string;
  displayName: string;
  category: ConnectChannelCategory;
  connectPattern: ConnectPattern;
  status: ConnectChannelStatus;
  logoUrl: string | null;
  description: string | null;
  docsUrl: string | null;
  aliases?: string[];
}

/**
 * Public-facing host metadata returned alongside a connection status.
 *
 * Currently populated for Airbnb only — the host's first name + Airbnb avatar
 * pulled from the partner-API host record. Email is intentionally NOT
 * included: Airbnb does not expose host email through their partner API,
 * and the customer's own login email is what they already know.
 *
 * For non-Airbnb providers `host` is `null` until per-provider enrichment
 * lands.
 */
export interface ConnectHost {
  /** Short display name (e.g. Airbnb first name). */
  displayName: string | null;
  /** Preferred long-form name; falls back to displayName when no preferred form is set. */
  displayNameLong: string | null;
  /** Profile picture URL (small). */
  avatarUrl: string | null;
  /** Profile picture URL (large). */
  avatarUrlLarge: string | null;
  /** Per-provider activation/onboarding status. */
  activationStatus: string | null;
}

export interface ConnectStatus {
  connected: boolean;
  provider: string;
  /**
   * Repull-side connection ID. Stable across token refreshes. Present when
   * `connected` is true. v0.2.0: now a string (was number in v0.1.x).
   */
  id?: string;
  externalAccountId?: string | null;
  status?: 'active' | 'inactive' | 'error';
  createdAt?: string;
  /**
   * Host metadata for the linked account. Populated for Airbnb when the
   * host row exists; null for other providers. Use this to render an
   * account-level confirmation card (avatar + name) instead of just an ID.
   */
  host?: ConnectHost | null;
  /**
   * Airbnb only: every Airbnb account this workspace has connected, including
   * ones since disconnected. Pass `externalAccountId` as `accountId` to
   * `disconnect()` to disconnect one account.
   */
  accounts?: ConnectAccount[];
  [key: string]: unknown;
}

/** One entry of {@link ConnectStatus.accounts}. */
export interface ConnectAccount {
  /** Airbnb host id, as a string (it can exceed 2^53). */
  externalAccountId?: string;
  name?: string | null;
  pictureUrl?: string | null;
  status?: string | null;
  /** True while the account is active and its authorization is usable. */
  connected?: boolean;
}

export type AirbnbAccessType = 'read_only' | 'full_access' | 'messaging';

export type RepullProvider =
  | 'airbnb'
  | 'booking'
  | 'plumguide'
  | 'vrbo'
  | 'hostaway'
  | 'guesty'
  | 'lodgify'
  | 'hostfully'
  | (string & {});

/**
 * Canonical paginated list response. Every list endpoint on
 * `api.repull.dev` returns this exact shape in v0.2.0 — no more bespoke
 * envelopes, no more legacy `offset/limit` pagination.
 *
 * Walk pages with `?cursor=<pagination.nextCursor>`; stop when
 * `pagination.hasMore` is `false`.
 */
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * @deprecated Alias for {@link ListResponse}. v0.1.x called this
 * `CursorListResponse`. Will be removed in a future major.
 */
export type CursorListResponse<T> = ListResponse<T>;

/**
 * @deprecated Alias for `ListResponse<Reservation>`. v0.1.x called this
 * `ReservationListResponse`. Will be removed in a future major.
 */
export type ReservationListResponse<T = Reservation> = ListResponse<T>;

/** Health endpoint response. */
export interface HealthResponse {
  status: 'ok' | 'degraded' | string;
  service: string;
  version: string;
  timestamp: string;
}

// ============================================================================
// Atlas market intelligence (`GET /v1/markets`)
// ============================================================================

/** One market the customer operates in (per-city KPIs). */
export type MarketSummary = components['schemas']['MarketSummary'];

/** Customer listing pin for the markets map view (lat/lng + ADR). */
export type MarketMyListing = components['schemas']['MarketMyListing'];
/** @deprecated Alias for {@link MarketMyListing}. Removed in a future major. */
export type MarketListingPin = MarketMyListing;

/** A market the customer doesn't yet operate in but Atlas has comp coverage for. */
export type MarketBrowseEntry = components['schemas']['MarketBrowseEntry'];
/** @deprecated Alias for {@link MarketBrowseEntry}. Removed in a future major. */
export type BrowseMarket = MarketBrowseEntry;

/** Featured discovery market entry on the markets overview. */
export type MarketBrowseFeatured = components['schemas']['MarketBrowseFeatured'];
/** Country bucket for the markets overview discovery summary. */
export type MarketBrowseCategory = components['schemas']['MarketBrowseCategory'];

/**
 * `GET /v1/markets` overview response. v0.2.0 reshape: per-city KPIs now
 * live in `data` (matches the canonical envelope), with auxiliary slices
 * (`totals`, `myListings`, `browse`, `freeMarket`, `subscriptions`,
 * `tier`) returned as siblings.
 */
export type MarketsResponse = components['schemas']['MarketsOverviewResponse'];

/** `GET /v1/markets/browse` paginated discovery catalog. */
export type MarketBrowseResponse = components['schemas']['MarketBrowseResponse'];

// ============================================================================
// Atlas pricing recommendations (`GET /v1/listings/{id}/pricing`)
// ============================================================================

export type PricingRecommendationStatus = 'pending' | 'applied' | 'declined' | 'expired' | string;

/**
 * One day's pricing recommendation. `factors` is a free-form structure the
 * model emits (e.g. `{ event: 'F1 Grand Prix', demand: 'high' }`) — render
 * its keys as chips.
 */
export interface PricingRecommendation {
  date: string;
  currentPrice: number | null;
  recommendedPrice: number;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  confidence: number;
  bookingProbability: number | null;
  expectedRevenue: number | null;
  factors: Record<string, unknown> | null;
  status: PricingRecommendationStatus;
  modelVersion: string | null;
  generatedAt: string | null;
}

export interface PricingResponse {
  recommendations: PricingRecommendation[];
  listing?: {
    aiBasePrice?: number | null;
    aiBasePriceFactors?: Record<string, unknown> | null;
    aiQualityTier?: string | null;
    aiSegment?: string | null;
    currency?: string | null;
  } | null;
  compSummary?: {
    compCount: number;
    compAvg: number | null;
    compMin: number | null;
    compMax: number | null;
  } | null;
  [key: string]: unknown;
}

// ─── Repull Migrate ──────────────────────────────────────────────
/** One migration — a property manager moved into a workspace of their own. */
export type Migration = components['schemas']['Migration'];
export type MigrationState = components['schemas']['Migration']['state'];
export type MigrationImportRun = components['schemas']['MigrationImportRun'];
export type MigrationReport = components['schemas']['MigrationReport'];
export type MigrationChannelMap = components['schemas']['MigrationChannelMap'];
export type MigrationCutoverCheck = components['schemas']['MigrationCutoverCheck'];
export type MigrationReservationRef = components['schemas']['MigrationReservationRef'];
export type MigrationImportPayload = components['schemas']['MigrationImportPayload'];
export type MigrationCompletedEvent = components['schemas']['MigrationCompletedEvent'];
export type MigrationFailedEvent = components['schemas']['MigrationFailedEvent'];

// Force types-only namespace
export type Paths = paths;
