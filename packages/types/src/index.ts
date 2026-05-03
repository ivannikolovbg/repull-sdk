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

import type { components, paths } from './openapi.js';

export type { components, paths } from './openapi.js';

/** Convenience aliases over the generated `components.schemas`. */
export type Property = components['schemas']['Property'];
export type Reservation = components['schemas']['Reservation'];
export type Listing = components['schemas']['Listing'];
export type ListingChannel = components['schemas']['ListingChannel'];
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
  [key: string]: unknown;
}

export type AirbnbAccessType = 'read_only' | 'full_access';

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

// Force types-only namespace
export type Paths = paths;
