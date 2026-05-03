/**
 * @repull/sdk — official TypeScript SDK for api.repull.dev.
 *
 * Hand-written ergonomic facade over the documented REST surface.
 *
 * v0.2.0 — MAJOR canonical release. Breaking changes:
 *   - All list endpoints now wrap in `{ data, pagination: { nextCursor,
 *     hasMore, total? } }`. Legacy `?offset=` walks removed (properties,
 *     reservations). Bespoke shapes normalized (`/v1/markets`,
 *     `/v1/reviews/{id}`, `/v1/channels/airbnb/listings`).
 *   - All response field names are camelCase (`guestId`, `listingId`,
 *     `lastMessageAt`, `unreadCount`, `createdAt`, etc).
 *   - All ID fields are `string` (Listing.id, Property.id, Guest.id,
 *     Reservation.id, foreign keys).
 *   - `POST /v1/connect/airbnb` response: `oauthUrl` → `url`.
 *   - New top-level surface `repull.listings.list / get` (was missing from
 *     v0.1.x — only `repull.listings.pricing` was exposed).
 *
 * Additive:
 *   - Self-documenting error envelope (`fix`, `docs_url`, `request_id`,
 *     `field`, `value_received`, `valid_values`, `did_you_mean`,
 *     `retry_after`).
 *   - Rate-limit headers + 429 with `Retry-After` (auto-honored by the
 *     SDK retry loop).
 *   - `xSchema` per-call option still works on every read endpoint.
 *   - `repull.markets.browse()` for the paginated market discovery
 *     catalog.
 *
 * Browser-safe behind a server proxy. Do NOT pass `apiKey` directly from
 * a browser bundle without `dangerouslyAllowBrowser: true`. Mirror the
 * pattern used by the OpenAI / Anthropic SDKs.
 */

export { Repull } from './client.js';
export type { RepullOptions, FetchLike } from './client.js';
export { RepullError, RepullAuthError, RepullRateLimitError, RepullValidationError } from './errors.js';
export type {
  Property,
  Reservation,
  Listing,
  ListingChannel,
  Guest,
  Conversation,
  Message,
  Review,
  Connection,
  WebhookSubscription,
  AIOperation,
  ConnectSession,
  ConnectStatus,
  ConnectHost,
  ConnectPickerSession,
  ConnectProvider,
  ConnectPattern,
  ConnectChannelCategory,
  ConnectChannelStatus,
  AirbnbAccessType,
  ListResponse,
  CursorListResponse,
  ReservationListResponse,
  Pagination,
  CursorPagination,
  ReservationPagination,
  HealthResponse,
  MarketSummary,
  MarketMyListing,
  MarketListingPin,
  MarketBrowseEntry,
  BrowseMarket,
  MarketBrowseFeatured,
  MarketBrowseCategory,
  MarketsResponse,
  MarketBrowseResponse,
  PricingRecommendation,
  PricingRecommendationStatus,
  PricingResponse,
  CustomSchema,
  CustomSchemaSummary,
  CustomSchemaCreate,
  CustomSchemaCreateResponse,
  CustomSchemaUpdate,
  CustomSchemaListResponse,
  CustomSchemaDeleteResponse,
  CustomSchemaMappings,
} from '@repull/types';
