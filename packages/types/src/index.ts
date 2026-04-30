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
export type PaginatedResponse = components['schemas']['PaginatedResponse'];

/** Hand-typed (the OpenAPI shape was loose). */
export interface ConnectSession {
  oauthUrl: string;
  sessionId: string;
  provider: string;
  expiresAt: string;
}

export interface ConnectStatus {
  connected: boolean;
  provider: string;
  externalAccountId?: string | null;
  status?: 'active' | 'inactive' | 'error';
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

/** Standard paginated list response used across most list endpoints. */
export interface ListResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** Health endpoint response. */
export interface HealthResponse {
  status: 'ok' | 'degraded' | string;
  service: string;
  version: string;
  timestamp: string;
}

// Force types-only namespace
export type Paths = paths;
