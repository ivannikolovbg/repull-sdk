// Public surface for @repull/types — re-exports the generated openapi types
// plus a small set of hand-curated convenience aliases.

import type { components, paths } from './openapi.js';

export type { components, paths } from './openapi.js';

/** Convenience aliases over the generated `components.schemas`. */
export type Property = components['schemas']['Property'];
export type Reservation = components['schemas']['Reservation'];
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
 * Standard offset+limit pagination metadata. Returned by most list endpoints.
 *
 * `/v1/reservations` and `/v1/listings` use {@link ReservationPagination} /
 * {@link CursorPagination} instead — they support cursor walks.
 */
export type Pagination = components['schemas']['Pagination'];
/**
 * Cursor-only pagination — used by `/v1/reviews`, `/v1/conversations`,
 * `/v1/conversations/{id}/messages`, `/v1/listings`, etc. Pass
 * `next_cursor` back as `?cursor=` to fetch the next page; stop when
 * `has_more` is `false`.
 */
export type CursorPagination = components['schemas']['CursorPagination'];
/**
 * Reservation-list pagination — supports both legacy offset/limit and the
 * new cursor walk during the deprecation window. Migrate to `next_cursor`.
 */
export type ReservationPagination = components['schemas']['ReservationPagination'];

/** Hand-typed (the OpenAPI shape was loose). */
export interface ConnectSession {
  oauthUrl: string;
  sessionId: string;
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
  /** Repull-side connection ID. Stable across token refreshes. Present when `connected` is true. */
  id?: number;
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
 * Standard paginated list response used by `/v1/properties` (and other
 * legacy offset/limit endpoints). For cursor walks (e.g. `/v1/reviews`,
 * `/v1/conversations`) use {@link CursorListResponse}; reservations use
 * {@link ReservationListResponse} which has both shapes during the
 * deprecation window.
 */
export interface ListResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
  };
}

/**
 * Cursor-paginated list response. Pass `pagination.next_cursor` back as
 * `?cursor=<value>` to fetch the next page; stop when `pagination.has_more`
 * is `false`.
 */
export interface CursorListResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

/**
 * Reservation list response — supports both the legacy `?offset=` walk
 * (returns `total/limit/offset`) and the new `?cursor=` walk (returns
 * `next_cursor/has_more`) during the deprecation window. Migrate to
 * `next_cursor`; legacy fields are removed after the `Sunset` header date.
 */
export interface ReservationListResponse<T = Reservation> {
  data: T[];
  pagination: {
    next_cursor?: string | null;
    has_more?: boolean;
    total?: number;
    limit?: number;
    offset?: number;
  };
}

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

/**
 * One market (city) the customer operates in, with KPIs derived from the
 * customer's own listings and Atlas's competitor index.
 *
 * `priceDiffPct` is positive when the customer's ADR is above the market
 * average — i.e. they're priced higher than competitors.
 */
export interface MarketSummary {
  city: string;
  myListings: number;
  totalListings: number;
  marketSharePct: number | null;
  myAvgAdr: number | null;
  marketAvgAdr: number | null;
  priceDiffPct: number | null;
  myAvgRating: number | null;
  marketAvgRating: number | null;
  myOccupancyPct: number | null;
  marketOccupancyPct: number | null;
  propertyTypes: number;
}

/** Customer listing pin for the markets map view (lat/lng + ADR). */
export interface MarketListingPin {
  id: number;
  name: string | null;
  city: string | null;
  lat: number;
  lng: number;
  thumbnail: string | null;
  todayPrice: number | null;
  blocked: boolean;
  bookedNights: number;
  availableNights: number;
  type: 'mine';
}

/** A market the customer doesn't yet operate in but Atlas has comp coverage for. */
export interface BrowseMarket {
  city: string;
  listings: number;
}

export interface MarketsResponse {
  markets: MarketSummary[];
  totals: {
    myListings: number;
    markets: number;
    totalCompetitors?: number;
  };
  myListings?: MarketListingPin[];
  browseMarkets?: BrowseMarket[];
}

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
