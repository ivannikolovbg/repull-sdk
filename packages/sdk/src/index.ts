/**
 * @repull/sdk — official TypeScript SDK for api.repull.dev.
 *
 * Hand-written ergonomic facade over the documented REST surface.
 * v0.1.1 — adds `repull.conversations`, `repull.guests`, `repull.reviews`,
 * and migrates `repull.reservations.list()` to cursor pagination (legacy
 * `?offset=` walk still works during the deprecation window).
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
} from '@repull/types';
