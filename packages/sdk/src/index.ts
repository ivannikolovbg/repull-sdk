/**
 * @repull/sdk — official TypeScript SDK for api.repull.dev.
 *
 * Hand-written ergonomic facade over the documented REST surface.
 * v0.1.2 — adds `repull.schemas` (custom field-mapping CRUD) and the
 * `xSchema` per-call option on every read endpoint
 * (`reservations`, `conversations`, `guests`, `reviews`). Also picks up
 * the corrected `Reservation` shape — `propertyId` / `guestFirstName` /
 * `guestLastName` / `guestEmail` / `guestPhone` / `guestCount` /
 * `provider` are removed; real fields are `listingId` / `guestId` /
 * `guestDetails` / `guestName`. Consumers depending on the old fields
 * will see breaking type changes — that's intentional, the old types
 * were lying.
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
  MarketListingPin,
  BrowseMarket,
  MarketsResponse,
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
