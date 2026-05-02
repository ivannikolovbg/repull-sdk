/**
 * Repull SDK client — the hand-written ergonomic facade.
 *
 *   const repull = new Repull({ apiKey });
 *   const session = await repull.connect.airbnb.create({ redirectUrl, accessType });
 *   const reservations = await repull.reservations.list();
 *   const ok = await repull.health.check();
 *
 * Browser usage requires either:
 *   - a server proxy that forwards to api.repull.dev with the key, with
 *     the SDK constructed via `new Repull({ baseUrl: '/api/repull-proxy' })`,
 *     OR
 *   - explicit `dangerouslyAllowBrowser: true` (not recommended).
 */

import type {
  ConnectSession,
  ConnectPickerSession,
  ConnectProvider,
  ConnectStatus,
  Connection,
  Conversation,
  CursorListResponse,
  Guest,
  HealthResponse,
  ListResponse,
  MarketsResponse,
  Message,
  PricingResponse,
  Property,
  Reservation,
  ReservationListResponse,
  Review,
  AirbnbAccessType,
} from '@repull/types';
import { RepullError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.repull.dev';
const DEFAULT_USER_AGENT = '@repull/sdk/0.1.1';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface RepullOptions {
  /** Bearer token. `sk_test_*` or `sk_live_*`, or any other key the API accepts. */
  apiKey?: string;
  /** Default `https://api.repull.dev`. Pass a relative URL like `/api/repull-proxy` for a server-mediated browser setup. */
  baseUrl?: string;
  /**
   * Set to `true` to allow constructing the SDK directly in a browser with a
   * raw `apiKey`. Default is `false`. Recommended pattern is a server proxy.
   */
  dangerouslyAllowBrowser?: boolean;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: FetchLike;
  /** Override the User-Agent header (server only). */
  userAgent?: string;
  /** Number of retries on 429/5xx. Default 2. */
  maxRetries?: number;
}

const isBrowser = typeof window !== 'undefined' && typeof (globalThis as { document?: unknown }).document !== 'undefined';

export class Repull {
  readonly connect: ConnectNamespace;
  readonly reservations: ReservationsNamespace;
  readonly properties: PropertiesNamespace;
  readonly conversations: ConversationsNamespace;
  readonly guests: GuestsNamespace;
  readonly reviews: ReviewsNamespace;
  readonly health: HealthNamespace;
  readonly channels: ChannelsNamespace;
  readonly markets: MarketsNamespace;
  readonly listings: ListingsNamespace;

  private readonly opts: {
    apiKey?: string;
    baseUrl: string;
    dangerouslyAllowBrowser: boolean;
    maxRetries: number;
    fetch: FetchLike;
    userAgent: string;
  };

  constructor(opts: RepullOptions = {}) {
    const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    const dangerouslyAllowBrowser = opts.dangerouslyAllowBrowser ?? false;
    const fetchImpl: FetchLike = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
    const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;

    if (
      isBrowser &&
      opts.apiKey &&
      !dangerouslyAllowBrowser &&
      !looksLikeRelativeUrl(baseUrl)
    ) {
      throw new Error(
        '[Repull] Refusing to send `apiKey` directly from a browser to ' +
          baseUrl +
          '. Either route requests through a server proxy (set `baseUrl` to a relative path like ' +
          '`/api/repull-proxy` and forward server-side) or pass `dangerouslyAllowBrowser: true`.'
      );
    }

    this.opts = {
      apiKey: opts.apiKey,
      baseUrl,
      dangerouslyAllowBrowser,
      maxRetries: opts.maxRetries ?? 2,
      fetch: fetchImpl,
      userAgent,
    };

    this.connect = new ConnectNamespace(this);
    this.reservations = new ReservationsNamespace(this);
    this.properties = new PropertiesNamespace(this);
    this.conversations = new ConversationsNamespace(this);
    this.guests = new GuestsNamespace(this);
    this.reviews = new ReviewsNamespace(this);
    this.health = new HealthNamespace(this);
    this.channels = new ChannelsNamespace(this);
    this.markets = new MarketsNamespace(this);
    this.listings = new ListingsNamespace(this);
  }

  /** @internal */
  async request<T>(method: string, path: string, init: { query?: Record<string, unknown>; body?: unknown } = {}): Promise<T> {
    const url = buildUrl(this.opts.baseUrl, path, init.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.opts.apiKey) headers.Authorization = `Bearer ${this.opts.apiKey}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (!isBrowser) headers['User-Agent'] = this.opts.userAgent;

    const reqInit: RequestInit = {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    };

    let attempt = 0;
    while (true) {
      let res: Response;
      try {
        res = await this.opts.fetch(url, reqInit);
      } catch (err) {
        if (attempt < this.opts.maxRetries) {
          attempt++;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw err;
      }

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        const text = await res.text();
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }

      // Retry on 429/5xx
      if ((res.status === 429 || res.status >= 500) && attempt < this.opts.maxRetries) {
        attempt++;
        const retryAfter = Number(res.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt);
        await sleep(delay);
        continue;
      }

      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep as text */
      }
      throw RepullError.fromResponse(res.status, parsed as never);
    }
  }
}

class ConnectNamespace {
  readonly airbnb: AirbnbConnectNamespace;
  readonly booking: ProviderConnectNamespace;
  readonly plumguide: ProviderConnectNamespace;
  readonly vrbo: ProviderConnectNamespace;

  constructor(private readonly client: Repull) {
    this.airbnb = new AirbnbConnectNamespace(client);
    this.booking = new ProviderConnectNamespace(client, 'booking');
    this.plumguide = new ProviderConnectNamespace(client, 'plumguide');
    this.vrbo = new ProviderConnectNamespace(client, 'vrbo');
  }

  /** GET /v1/connect — list every connection on this workspace. */
  list(): Promise<Connection[]> {
    return this.client.request<Connection[]>('GET', '/v1/connect');
  }

  /**
   * POST /v1/connect — mint a multi-channel picker session.
   *
   * The user is sent to a hosted picker (`session.url`) where they choose
   * one of the available channels (Airbnb OAuth, Booking.com claim, PMS
   * credentials, etc) and complete the per-pattern handoff. They land on
   * your `redirectUrl` once finished.
   *
   * Pass `allowedProviders` to scope the picker to a subset (e.g. only show
   * PMSes). Pass `state` for any opaque value you want echoed back.
   */
  createSession(opts: {
    redirectUrl: string;
    allowedProviders?: string[];
    state?: string;
  }): Promise<ConnectPickerSession> {
    return this.client.request<ConnectPickerSession>('POST', '/v1/connect', {
      body: {
        redirectUrl: opts.redirectUrl,
        ...(opts.allowedProviders ? { allowed_providers: opts.allowedProviders } : {}),
        ...(opts.state ? { state: opts.state } : {}),
      },
    });
  }

  /**
   * GET /v1/connect/providers — list every channel currently wired into the
   * picker (OTA + PMS, OAuth + credentials + claim + activation patterns).
   */
  providers(): Promise<{ data: ConnectProvider[] }> {
    return this.client.request<{ data: ConnectProvider[] }>('GET', '/v1/connect/providers');
  }

  /** Generic provider creator for non-Airbnb providers (PMS keys, OAuth). */
  create(provider: string, body: Record<string, unknown>): Promise<unknown> {
    return this.client.request('POST', `/v1/connect/${encodeURIComponent(provider)}`, { body });
  }

  /** Generic provider status. */
  status(provider: string): Promise<ConnectStatus> {
    return this.client.request<ConnectStatus>('GET', `/v1/connect/${encodeURIComponent(provider)}`);
  }

  /** Generic provider disconnect. */
  disconnect(provider: string): Promise<unknown> {
    return this.client.request('DELETE', `/v1/connect/${encodeURIComponent(provider)}`);
  }
}

class AirbnbConnectNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/connect/airbnb — mint an OAuth Connect session.
   *
   * Returns `{ oauthUrl, sessionId, provider, expiresAt }`. Send the user
   * to `oauthUrl` (hosted at `connect.repull.dev`) and they'll bounce back
   * to `redirectUrl` after consent.
   */
  create(opts: { redirectUrl: string; accessType?: AirbnbAccessType }): Promise<ConnectSession> {
    return this.client.request<ConnectSession>('POST', '/v1/connect/airbnb', {
      body: {
        redirectUrl: opts.redirectUrl,
        accessType: opts.accessType ?? 'full_access',
      },
    });
  }

  /** GET /v1/connect/airbnb — current connection status. */
  status(): Promise<ConnectStatus> {
    return this.client.request<ConnectStatus>('GET', '/v1/connect/airbnb');
  }

  /** DELETE /v1/connect/airbnb — disconnect Airbnb. */
  disconnect(): Promise<unknown> {
    return this.client.request('DELETE', '/v1/connect/airbnb');
  }
}

class ProviderConnectNamespace {
  constructor(private readonly client: Repull, private readonly provider: string) {}

  status(): Promise<ConnectStatus> {
    return this.client.request<ConnectStatus>('GET', `/v1/connect/${this.provider}`);
  }

  create(body: Record<string, unknown>): Promise<unknown> {
    return this.client.request('POST', `/v1/connect/${this.provider}`, { body });
  }

  disconnect(): Promise<unknown> {
    return this.client.request('DELETE', `/v1/connect/${this.provider}`);
  }
}

class ReservationsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/reservations — cursor-paginated list.
   *
   * Pass `cursor` from the previous response's `pagination.next_cursor` to
   * walk forward; stop when `pagination.has_more` is `false`. The legacy
   * `offset` parameter still works during the deprecation window but
   * responses come back with a `Deprecation: true` header — migrate to
   * `cursor`.
   */
  list(
    query: {
      limit?: number;
      cursor?: string;
      /** @deprecated Use `cursor` instead. Removed after the response Sunset date. */
      offset?: number;
      status?: 'confirmed' | 'pending' | 'cancelled' | 'completed' | string;
      platform?: string;
      listing_id?: number;
      check_in_after?: string;
      check_in_before?: string;
      check_out_after?: string;
      check_out_before?: string;
      from?: string;
      to?: string;
    } = {},
  ): Promise<ReservationListResponse<Reservation>> {
    return this.client.request<ReservationListResponse<Reservation>>('GET', '/v1/reservations', { query });
  }

  /** GET /v1/reservations/{id}. */
  get(id: string | number): Promise<Reservation> {
    return this.client.request<Reservation>('GET', `/v1/reservations/${encodeURIComponent(String(id))}`);
  }
}

/**
 * Cross-channel guest conversations. Backed by Booking.com + Airbnb (and
 * future channels) — `/v1/conversations` returns a unified thread list.
 */
class ConversationsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/conversations — cursor-paginated list of conversation threads.
   *
   * Pass `cursor` from the previous response's `pagination.next_cursor` to
   * walk forward; stop when `pagination.has_more` is `false`.
   */
  list(query: { limit?: number; cursor?: string; channel?: string } = {}): Promise<CursorListResponse<Conversation>> {
    return this.client.request<CursorListResponse<Conversation>>('GET', '/v1/conversations', { query });
  }

  /** GET /v1/conversations/{id}/messages — messages on a thread, newest first. */
  messages(
    conversationId: string | number,
    query: { limit?: number; cursor?: string } = {},
  ): Promise<CursorListResponse<Message>> {
    return this.client.request<CursorListResponse<Message>>(
      'GET',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages`,
      { query },
    );
  }

  /** POST /v1/conversations/{id}/messages — send a message on the thread. */
  send(conversationId: string | number, body: { text: string; [k: string]: unknown }): Promise<Message> {
    return this.client.request<Message>(
      'POST',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages`,
      { body },
    );
  }
}

/**
 * Guest CRM — the canonical guest record (name, email, phone, stays).
 */
class GuestsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/guests — cursor-paginated guest directory. */
  list(query: { limit?: number; cursor?: string; search?: string } = {}): Promise<CursorListResponse<Guest>> {
    return this.client.request<CursorListResponse<Guest>>('GET', '/v1/guests', { query });
  }

  /** GET /v1/guests/{id} — full guest profile. */
  get(id: string | number): Promise<Guest> {
    return this.client.request<Guest>('GET', `/v1/guests/${encodeURIComponent(String(id))}`);
  }
}

/**
 * Channel-agnostic guest reviews. `/v1/reviews` aggregates Airbnb + Booking
 * + direct review channels into one cursor-paginated stream.
 */
class ReviewsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/reviews — cursor-paginated review stream across channels. */
  list(query: { limit?: number; cursor?: string; channel?: string; listing_id?: number } = {}): Promise<CursorListResponse<Review>> {
    return this.client.request<CursorListResponse<Review>>('GET', '/v1/reviews', { query });
  }

  /** GET /v1/reviews/{id}. */
  get(id: string | number): Promise<Review> {
    return this.client.request<Review>('GET', `/v1/reviews/${encodeURIComponent(String(id))}`);
  }
}

class PropertiesNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/properties — paginated list. */
  list(query: { limit?: number; offset?: number } = {}): Promise<ListResponse<Property>> {
    return this.client.request<ListResponse<Property>>('GET', '/v1/properties', { query });
  }

  /** GET /v1/properties/{id}. */
  get(id: string | number): Promise<Property> {
    return this.client.request<Property>('GET', `/v1/properties/${encodeURIComponent(String(id))}`);
  }
}

class HealthNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/health — service heartbeat. */
  check(): Promise<HealthResponse> {
    return this.client.request<HealthResponse>('GET', '/v1/health');
  }
}

class ChannelsNamespace {
  readonly airbnb: AirbnbChannelNamespace;

  constructor(private readonly client: Repull) {
    this.airbnb = new AirbnbChannelNamespace(client);
  }
}

class AirbnbChannelNamespace {
  readonly listings: AirbnbListingsNamespace;

  constructor(client: Repull) {
    this.listings = new AirbnbListingsNamespace(client);
  }
}

class AirbnbListingsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings — read-only listing index with `connections` info. */
  list(query: { limit?: number; offset?: number } = {}): Promise<unknown> {
    return this.client.request<unknown>('GET', '/v1/channels/airbnb/listings', { query });
  }

  /** GET /v1/channels/airbnb/listings/{id}. */
  get(id: string | number): Promise<unknown> {
    return this.client.request<unknown>('GET', `/v1/channels/airbnb/listings/${encodeURIComponent(String(id))}`);
  }
}

/**
 * Atlas market intelligence — every market the workspace operates in plus
 * KPIs (own ADR vs market ADR, occupancy, ratings, share). Backed by Atlas,
 * Vanio's market-intelligence fleet of 660 live workers.
 */
class MarketsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/markets — overview of every market the customer has listings
   * in, plus discovery list of nearby Atlas-tracked markets.
   *
   * Response is intentionally typed loosely (`unknown`) until the upstream
   * shape stabilises — sandbox + live keys may return slightly different
   * field sets while the endpoint is in beta.
   */
  list(): Promise<MarketsResponse> {
    return this.client.request<MarketsResponse>('GET', '/v1/markets');
  }
}

/**
 * Atlas pricing recommendations + apply/decline action. Recommendations
 * are pre-computed by the model and stored in `pricing_recommendations`;
 * this surface reads them and writes back the user's response.
 */
class ListingsNamespace {
  readonly pricing: ListingsPricingNamespace;

  constructor(client: Repull) {
    this.pricing = new ListingsPricingNamespace(client);
  }
}

class ListingsPricingNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/listings/{id}/pricing — recommendations + factors for a
   * listing's calendar window.
   */
  get(
    listingId: string | number,
    query: { startDate?: string; endDate?: string } = {},
  ): Promise<PricingResponse> {
    return this.client.request<PricingResponse>(
      'GET',
      `/v1/listings/${encodeURIComponent(String(listingId))}/pricing`,
      { query },
    );
  }

  /**
   * Convenience alias matching the marketing copy
   * (`repull.listings.pricing.recommendations(id)`).
   */
  recommendations(
    listingId: string | number,
    query: { startDate?: string; endDate?: string } = {},
  ): Promise<PricingResponse> {
    return this.get(listingId, query);
  }

  /**
   * POST /v1/listings/{id}/pricing — apply or decline pending
   * recommendations for one or more dates. Apply syncs the new price to
   * the listing's calendar (and to the OTAs via fan-out).
   */
  action(
    listingId: string | number,
    body: { dates: string[]; action: 'apply' | 'decline' },
  ): Promise<unknown> {
    return this.client.request(
      'POST',
      `/v1/listings/${encodeURIComponent(String(listingId))}/pricing`,
      { body },
    );
  }
}

// helpers

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${trimmedBase}${trimmedPath}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function looksLikeRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

function backoffMs(attempt: number): number {
  // 250ms, 750ms, 2.25s, ...  (exponential with jitter)
  const base = 250 * Math.pow(3, attempt - 1);
  const jitter = Math.random() * base * 0.25;
  return Math.min(base + jitter, 5000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
