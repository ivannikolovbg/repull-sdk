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
  AirbnbAccessType,
  AirbnbAmenitiesResult,
  AirbnbAmenitiesUpdateRequest,
  AirbnbAmenitiesUpdateResult,
  AirbnbBookingSettingsResult,
  AirbnbBookingSettingsUpdateRequest,
  AirbnbBookingSettingsUpdateResult,
  AirbnbContentWriteResponse,
  AirbnbDescriptionWriteRequest,
  AirbnbDescriptionsResult,
  AirbnbListing,
  AirbnbListingDetailsResult,
  AirbnbListingDetailsWriteRequest,
  AirbnbListingListResponse,
  AirbnbOffer,
  AirbnbPermitsResult,
  AirbnbPermitsWriteRequest,
  AirbnbPermitsWriteResult,
  AirbnbPhotoCoverRequest,
  AirbnbPhotoCoverResult,
  AirbnbPhotoOrderRequest,
  AirbnbPhotoOrderResult,
  AirbnbPhotoUpdateRequest,
  AirbnbPhotoUpdateResult,
  AirbnbRoomUpdateRequest,
  AirbnbRoomUpdateResult,
  AirbnbRoomsResult,
  AirbnbSafetyDisclosuresResult,
  AirbnbSafetyDisclosuresWriteRequest,
  AirbnbSafetyDisclosuresWriteResult,
  ListingPullAirbnbRequest,
  ListingPullResponse,
  ConnectPickerSession,
  Migration,
  MigrationChannelMap,
  MigrationCutoverCheck,
  MigrationReport,
  ConnectProvider,
  ConnectSession,
  ConnectStatus,
  Connection,
  Conversation,
  ConversationPreApproval,
  ConversationPreApprovalRequest,
  CustomSchema,
  CustomSchemaCreate,
  CustomSchemaCreateResponse,
  CustomSchemaDeleteResponse,
  CustomSchemaListResponse,
  CustomSchemaUpdate,
  Guest,
  GuestCreateRequest,
  GuestCreateResponse,
  HealthResponse,
  InquiryListResponse,
  Listing,
  ListingActiveResponse,
  ListingMarketStateRequest,
  ListingMarketStateResponse,
  ListingStatusBatchRequest,
  ListingStatusBatchResponse,
  BookingPropertyActionRequest,
  BookingPropertyActionResponse,
  ConnectDisconnectResponse,
  ListResponse,
  MarketBrowseResponse,
  MarketsResponse,
  Message,
  PricingResponse,
  Property,
  Reservation,
  ReservationCreateRequest,
  ReservationCreateResponse,
  ReservationDeclineRequest,
  ReservationRequestResponse,
  ReservationUpdateRequest,
  ReservationUpdateResponse,
  Review,
  SendMessageRequest,
  SendMessageResponse,
  SpecialOffer,
  SpecialOfferCreateRequest,
  SpecialOfferWithdrawResponse,
} from '@repull/types';
import { RepullError } from './errors.js';
import { KvNamespace } from './kv.js';

const DEFAULT_BASE_URL = 'https://api.repull.dev';
const DEFAULT_USER_AGENT = '@repull/sdk/0.2.18';

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
  /**
   * Act on a workspace your workspace created through Repull Migrate: every
   * request carries `X-Workspace-Id`. Prefer `repull.workspace(id)`.
   */
  workspaceId?: string | number;
}

const isBrowser = typeof window !== 'undefined' && typeof (globalThis as { document?: unknown }).document !== 'undefined';

export class Repull {
  readonly connect: ConnectNamespace;
  readonly reservations: ReservationsNamespace;
  readonly properties: PropertiesNamespace;
  readonly conversations: ConversationsNamespace;
  readonly inquiries: InquiriesNamespace;
  readonly guests: GuestsNamespace;
  readonly reviews: ReviewsNamespace;
  readonly health: HealthNamespace;
  readonly channels: ChannelsNamespace;
  readonly markets: MarketsNamespace;
  readonly listings: ListingsNamespace;
  readonly schemas: SchemasNamespace;
  readonly kv: KvNamespace;
  readonly migrations: MigrationsNamespace;

  private readonly opts: {
    apiKey?: string;
    baseUrl: string;
    dangerouslyAllowBrowser: boolean;
    maxRetries: number;
    fetch: FetchLike;
    userAgent: string;
    workspaceId?: string;
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
      workspaceId: opts.workspaceId !== undefined ? String(opts.workspaceId) : undefined,
    };

    this.connect = new ConnectNamespace(this);
    this.reservations = new ReservationsNamespace(this);
    this.properties = new PropertiesNamespace(this);
    this.conversations = new ConversationsNamespace(this);
    this.inquiries = new InquiriesNamespace(this);
    this.guests = new GuestsNamespace(this);
    this.reviews = new ReviewsNamespace(this);
    this.health = new HealthNamespace(this);
    this.channels = new ChannelsNamespace(this);
    this.markets = new MarketsNamespace(this);
    this.listings = new ListingsNamespace(this);
    this.schemas = new SchemasNamespace(this);
    this.kv = new KvNamespace(this);
    this.migrations = new MigrationsNamespace(this);
  }

  /**
   * A client that acts on a workspace your workspace created through Repull
   * Migrate — same key, every request sent with `X-Workspace-Id`.
   *
   *   const pm = repull.workspace(migration.workspaceId)
   *   const { data } = await pm.properties.list()
   */
  workspace(workspaceId: string | number): Repull {
    return new Repull({
      apiKey: this.opts.apiKey,
      baseUrl: this.opts.baseUrl,
      dangerouslyAllowBrowser: this.opts.dangerouslyAllowBrowser,
      fetch: this.opts.fetch,
      userAgent: this.opts.userAgent,
      maxRetries: this.opts.maxRetries,
      workspaceId,
    });
  }

  /** @internal */
  async request<T>(
    method: string,
    path: string,
    init: {
      query?: Record<string, unknown>;
      body?: unknown;
      xSchema?: string;
      idempotencyKey?: string;
    } = {},
  ): Promise<T> {
    const url = buildUrl(this.opts.baseUrl, path, init.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.opts.apiKey) headers.Authorization = `Bearer ${this.opts.apiKey}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (!isBrowser) headers['User-Agent'] = this.opts.userAgent;
    if (init.xSchema) headers['X-Schema'] = init.xSchema;
    if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;
    if (this.opts.workspaceId) headers['X-Workspace-Id'] = this.opts.workspaceId;

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

      // Retry on 429/5xx — honor Retry-After header (seconds).
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

/**
 * Repull Migrate — every property manager you move gets a workspace of their
 * own. Start one with `connect.createSession({ purpose: 'migrate', … })`,
 * track it here, and read its data with `repull.workspace(workspaceId)`.
 */
class MigrationsNamespace {
  constructor(private readonly client: Repull) {}

  private path(workspaceId: string | number, suffix = ''): string {
    return `/v1/migrations/${encodeURIComponent(String(workspaceId))}${suffix}`;
  }

  /** GET /v1/migrations — newest first, cursor-paginated. */
  list(query: { limit?: number; cursor?: string } = {}): Promise<{
    data: Migration[];
    pagination: { nextCursor: string | null; hasMore: boolean; total: number };
  }> {
    return this.client.request('GET', '/v1/migrations', { query });
  }

  /** GET /v1/migrations/{workspaceId} — state, sources with their last import, counts. */
  get(workspaceId: string | number): Promise<{ data: Migration }> {
    return this.client.request('GET', this.path(workspaceId));
  }

  /** GET /v1/migrations/{workspaceId}/report — what landed, and what needs a decision. */
  report(workspaceId: string | number): Promise<{ data: MigrationReport }> {
    return this.client.request('GET', this.path(workspaceId, '/report'));
  }

  /** GET /v1/migrations/{workspaceId}/channel-map — Airbnb / Booking.com / VRBO links, read live. */
  channelMap(workspaceId: string | number): Promise<{ data: MigrationChannelMap }> {
    return this.client.request('GET', this.path(workspaceId, '/channel-map'));
  }

  /** POST /v1/migrations/{workspaceId}/import — run the import again. */
  import(
    workspaceId: string | number,
    body: { entities?: Array<'listings' | 'reservations' | 'messages' | 'calendar'>; since?: string } = {},
  ): Promise<{ data: { workspaceId: string; queued: Array<{ connectionId: string; provider: string; queued: boolean; error?: string }> } }> {
    return this.client.request('POST', this.path(workspaceId, '/import'), { body });
  }

  /** POST /v1/migrations/{workspaceId}/cutover-check — compare your upcoming reservations with the source. */
  cutoverCheck(
    workspaceId: string | number,
    reservations: Array<{ confirmationCode: string; checkIn: string; checkOut: string }>,
  ): Promise<{ data: MigrationCutoverCheck }> {
    return this.client.request('POST', this.path(workspaceId, '/cutover-check'), { body: { reservations } });
  }

  /** POST /v1/migrations/{workspaceId}/cutover — disconnect the source. Idempotent. */
  cutover(workspaceId: string | number): Promise<{ data: Migration & { disconnectedConnections: number } }> {
    return this.client.request('POST', this.path(workspaceId, '/cutover'));
  }

  /** DELETE /v1/migrations/{workspaceId} — cut over and deactivate. The data is kept. */
  delete(workspaceId: string | number): Promise<{ data: { workspaceId: string; deactivated: boolean; deactivatedAt: string } }> {
    return this.client.request('DELETE', this.path(workspaceId));
  }
}

class ConnectNamespace {
  readonly airbnb: AirbnbConnectNamespace;
  readonly booking: BookingConnectNamespace;
  readonly plumguide: ProviderConnectNamespace;
  readonly vrbo: ProviderConnectNamespace;

  constructor(private readonly client: Repull) {
    this.airbnb = new AirbnbConnectNamespace(client);
    this.booking = new BookingConnectNamespace(client);
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
    /** Pin the hosted pages' language (`en`, `fr`). */
    locale?: string;
    /**
     * `'migrate'` starts a Repull Migrate session: the property manager's data
     * lands in a workspace of their own, returned as `workspaceId`.
     */
    purpose?: 'connect' | 'migrate';
    /** Migrate only — the property manager being moved. */
    workspace?: { name: string; externalRef?: string };
    /** Migrate only — your wording for the hosted pages. */
    copy?: { title?: string; subtitle?: string; completedTitle?: string; completedBody?: string };
    /** Migrate only — what you want brought across, shown before they connect. */
    scope?: string[];
  }): Promise<ConnectPickerSession & { purpose?: 'migrate'; workspaceId?: string }> {
    return this.client.request('POST', '/v1/connect', {
      body: {
        redirectUrl: opts.redirectUrl,
        ...(opts.allowedProviders ? { allowedProviders: opts.allowedProviders } : {}),
        ...(opts.state ? { state: opts.state } : {}),
        ...(opts.locale ? { locale: opts.locale } : {}),
        ...(opts.purpose ? { purpose: opts.purpose } : {}),
        ...(opts.workspace ? { workspace: opts.workspace } : {}),
        ...(opts.copy ? { copy: opts.copy } : {}),
        ...(opts.scope ? { scope: opts.scope } : {}),
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

  /**
   * DELETE /v1/connect/{provider} — disconnect ONE connected account.
   *
   * Pass `accountId` (the Airbnb host id from `status().accounts[].externalAccountId`,
   * or the Booking.com hotel id). It may be omitted only when the workspace has
   * exactly one account for the provider — with several, the API returns 422
   * listing the valid ids. The account's listings are deactivated (not deleted)
   * and returned in `listingsDeactivated`; reactivate them with
   * `repull.listings.setStatus({ listingIds, active: true })` after reconnecting.
   */
  disconnect(provider: string, opts: DisconnectOptions = {}): Promise<ConnectDisconnectResponse> {
    return disconnectProvider(this.client, provider, opts);
  }
}

class AirbnbConnectNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/connect/airbnb — mint an OAuth Connect session.
   *
   * Returns `{ url, sessionId, provider, expiresAt }`. Send the user to
   * `url` (hosted at `connect.repull.dev`) and they'll bounce back to
   * `redirectUrl` after consent.
   *
   * v0.2.0: response field renamed `oauthUrl` → `url`.
   *
   * `accessType` is optional. Omit it to let the host pick the tier on the
   * consent screen; pass it to fix the tier and hide that choice. (Before
   * v0.2.14 the SDK always sent `full_access` when omitted.)
   */
  create(opts: { redirectUrl: string; accessType?: AirbnbAccessType }): Promise<ConnectSession> {
    // Only send `accessType` when the caller chose one: the API locks the
    // consent screen to whatever tier is sent, so defaulting it here would
    // silently take the tier choice away from the host.
    return this.client.request<ConnectSession>('POST', '/v1/connect/airbnb', {
      body: {
        redirectUrl: opts.redirectUrl,
        ...(opts.accessType !== undefined ? { accessType: opts.accessType } : {}),
      },
    });
  }

  /** GET /v1/connect/airbnb — current connection status. */
  status(): Promise<ConnectStatus> {
    return this.client.request<ConnectStatus>('GET', '/v1/connect/airbnb');
  }

  /**
   * DELETE /v1/connect/airbnb — disconnect one Airbnb account. Pass
   * `accountId` (a host id from `status().accounts[].externalAccountId`)
   * when the workspace has more than one.
   */
  disconnect(opts: DisconnectOptions = {}): Promise<ConnectDisconnectResponse> {
    return disconnectProvider(this.client, 'airbnb', opts);
  }
}

class BookingConnectNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/connect/booking — mint a hosted Booking.com Connect session.
   *
   * Returns `{ url, sessionId, provider, expiresAt }`. Send the user to
   * `url` (hosted at `connect.repull.dev`) — they designate the Repull
   * connectivity provider in their Booking.com Extranet and paste their
   * Hotel ID, then bounce back to `redirectUrl`.
   *
   * Unlike Airbnb, Booking.com takes no `accessType` — the flow grants the
   * full connectivity-provider scope.
   */
  create(opts: { redirectUrl: string }): Promise<ConnectSession> {
    return this.client.request<ConnectSession>('POST', '/v1/connect/booking', {
      body: {
        redirectUrl: opts.redirectUrl,
      },
    });
  }

  /** GET /v1/connect/booking — current connection status. */
  status(): Promise<ConnectStatus> {
    return this.client.request<ConnectStatus>('GET', '/v1/connect/booking');
  }

  /**
   * DELETE /v1/connect/booking — disconnect one Booking.com property. Pass
   * `accountId` (the hotel id) when the workspace has more than one.
   */
  disconnect(opts: DisconnectOptions = {}): Promise<ConnectDisconnectResponse> {
    return disconnectProvider(this.client, 'booking', opts);
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

  disconnect(opts: DisconnectOptions = {}): Promise<ConnectDisconnectResponse> {
    return disconnectProvider(this.client, this.provider, opts);
  }
}

class ReservationsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/reservations — cursor-paginated list.
   *
   * Pass `cursor` from the previous response's `pagination.nextCursor` to
   * walk forward; stop when `pagination.hasMore` is `false`. v0.2.0
   * removed the legacy `?offset=` walk.
   */
  list(
    query: {
      limit?: number;
      cursor?: string;
      status?: 'confirmed' | 'pending' | 'cancelled' | 'completed' | string;
      platform?: string;
      listingId?: string | number;
      check_in_after?: string;
      check_in_before?: string;
      check_out_after?: string;
      check_out_before?: string;
      from?: string;
      to?: string;
      include_total?: boolean;
    } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Reservation>> {
    return this.client.request<ListResponse<Reservation>>('GET', '/v1/reservations', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /** GET /v1/reservations/{id}. Pass `opts.xSchema` to apply a custom field-mapping schema. */
  get(id: string | number, opts: { xSchema?: string } = {}): Promise<Reservation> {
    return this.client.request<Reservation>('GET', `/v1/reservations/${encodeURIComponent(String(id))}`, {
      xSchema: opts.xSchema,
    });
  }

  /**
   * POST /v1/reservations — create a direct reservation. New in v0.2.12.
   *
   * `platform` is limited to `direct` / `website` / `owner`: OTA reservations
   * are owned by the channel and arrive through sync, so they cannot be
   * created here. The stay is priced by the pricing engine, not from the
   * request — read `totalPrice` back off the response.
   *
   * Pass `opts.idempotencyKey` (a UUID generated where you build the request)
   * to make a retry safe. The same key replays the stored response for 24
   * hours; the same key with a changed payload is rejected with
   * `422 idempotency_key_reused`.
   */
  create(
    body: ReservationCreateRequest,
    opts: { idempotencyKey?: string; xSchema?: string } = {},
  ): Promise<ReservationCreateResponse> {
    return this.client.request<ReservationCreateResponse>('POST', '/v1/reservations', {
      body,
      idempotencyKey: opts.idempotencyKey,
      xSchema: opts.xSchema,
    });
  }

  /**
   * PATCH /v1/reservations/{id} — change dates, times, guest count, or move
   * the reservation to another property. New in v0.2.12.
   *
   * At least one field is required. Guest identity, pricing, `status`,
   * `platform` and notes are rejected by name. A `listingId` change combined
   * with new dates is applied as ONE move, so the access code is re-issued
   * once. `changed` on the response lists the fields that were actually
   * written — and a move forces a confirmed `status`, so read it back rather
   * than assuming it is unchanged.
   *
   * Pass `opts.idempotencyKey` to make a retry safe (see `create`).
   */
  update(
    id: string | number,
    body: ReservationUpdateRequest,
    opts: { idempotencyKey?: string; xSchema?: string } = {},
  ): Promise<ReservationUpdateResponse> {
    return this.client.request<ReservationUpdateResponse>(
      'PATCH',
      `/v1/reservations/${encodeURIComponent(String(id))}`,
      { body, idempotencyKey: opts.idempotencyKey, xSchema: opts.xSchema },
    );
  }

  /**
   * POST /v1/reservations/{id}/accept — accept a pending Airbnb booking
   * request. New in v0.2.16.
   *
   * Only a reservation with `status: 'pending'` and a `respondBy` in the
   * future can be answered; Airbnb lapses an unanswered request 24 hours after
   * the guest asks. Takes no fields. Pass `opts.idempotencyKey` to make a
   * retry safe.
   */
  accept(
    id: string | number,
    opts: { idempotencyKey?: string } = {},
  ): Promise<ReservationRequestResponse> {
    return this.client.request<ReservationRequestResponse>(
      'POST',
      `/v1/reservations/${encodeURIComponent(String(id))}/accept`,
      { body: {}, idempotencyKey: opts.idempotencyKey },
    );
  }

  /**
   * POST /v1/reservations/{id}/decline — decline a pending Airbnb booking
   * request. New in v0.2.16.
   *
   * `reason` is Airbnb's decline reason verbatim (`dates_not_available`,
   * `not_comfortable`, `listing_not_ready`, `different_dates_needed`, `spam`,
   * `other`); `message` (1-500 chars) is sent to the guest with the decline.
   */
  decline(
    id: string | number,
    body: ReservationDeclineRequest,
    opts: { idempotencyKey?: string } = {},
  ): Promise<ReservationRequestResponse> {
    return this.client.request<ReservationRequestResponse>(
      'POST',
      `/v1/reservations/${encodeURIComponent(String(id))}/decline`,
      { body, idempotencyKey: opts.idempotencyKey },
    );
  }
}

/**
 * Cross-channel guest conversations. Backed by Booking.com + Airbnb (and
 * future channels) — `/v1/conversations` returns a unified thread list.
 */
class ConversationsNamespace {
  /** Airbnb special offers on an inquiry thread. New in v0.2.16. */
  readonly specialOffers: ConversationSpecialOffersNamespace;

  constructor(private readonly client: Repull) {
    this.specialOffers = new ConversationSpecialOffersNamespace(client);
  }

  /**
   * GET /v1/conversations — cursor-paginated list of conversation threads.
   *
   * Pass `cursor` from the previous response's `pagination.nextCursor` to
   * walk forward; stop when `pagination.hasMore` is `false`.
   */
  list(
    query: { limit?: number; cursor?: string; channel?: string; include_total?: boolean } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Conversation>> {
    return this.client.request<ListResponse<Conversation>>('GET', '/v1/conversations', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /** GET /v1/conversations/{id} — single conversation thread. */
  get(conversationId: string | number, opts: { xSchema?: string } = {}): Promise<Conversation> {
    return this.client.request<Conversation>(
      'GET',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}`,
      { xSchema: opts.xSchema },
    );
  }

  /** GET /v1/conversations/{id}/messages — messages on a thread, newest first. */
  messages(
    conversationId: string | number,
    query: { limit?: number; cursor?: string; order?: 'asc' | 'desc' } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Message>> {
    return this.client.request<ListResponse<Message>>(
      'GET',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages`,
      { query, xSchema: opts.xSchema },
    );
  }

  /**
   * POST /v1/conversations/{id}/messages — send a message to the guest on an
   * existing thread. New in v0.2.12.
   *
   * Omit `channel` to send on whichever channel the conversation already
   * uses — that is the right default. Check `contentRewritten` on the
   * response: when it is `true` the channel altered the text before delivery
   * (today that means Airbnb stripped a link, email address or phone number),
   * so the guest received `deliveredContent`, not `submittedContent`.
   *
   * Since v0.2.16 the body also takes `attachments` (1-5 files) alongside or
   * instead of `message`. Airbnb accepts images and video and sends each file
   * as its own message; Booking.com accepts JPEG/PNG and requires `message`;
   * SMS, email and website chat reject attachments with
   * `422 attachments_not_supported`.
   *
   * Pass `opts.idempotencyKey` (a UUID generated where you build the request)
   * to make a retry safe, so a network retry cannot send the guest the same
   * message twice. The same key with a changed payload is rejected with
   * `422 idempotency_key_reused`.
   */
  send(
    conversationId: string | number,
    body: SendMessageRequest,
    opts: { idempotencyKey?: string; xSchema?: string } = {},
  ): Promise<SendMessageResponse> {
    return this.client.request<SendMessageResponse>(
      'POST',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/messages`,
      { body, idempotencyKey: opts.idempotencyKey, xSchema: opts.xSchema },
    );
  }

  /**
   * POST /v1/conversations/{id}/pre-approval — pre-approve the guest on an
   * Airbnb inquiry so they can book at the listed price. New in v0.2.16.
   *
   * Pass `{ blockInstantBooking: true }` only when the guest must book
   * through this pre-approval rather than Instant Book. Read `expiresAt` off
   * the response for when the pre-approval lapses.
   */
  preApprove(
    conversationId: string | number,
    body: ConversationPreApprovalRequest = {},
    opts: { idempotencyKey?: string } = {},
  ): Promise<ConversationPreApproval> {
    return this.client.request<ConversationPreApproval>(
      'POST',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/pre-approval`,
      { body, idempotencyKey: opts.idempotencyKey },
    );
  }
}

/** Airbnb special offers — a custom price/dates offer on an inquiry thread. New in v0.2.16. */
class ConversationSpecialOffersNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/conversations/{id}/special-offers — send the guest a special
   * offer. `totalPrice` is the whole-stay total in the listing's Airbnb
   * currency; `listingId` defaults to the listing the conversation is about.
   * Keep the returned `id` to read or withdraw the offer.
   */
  create(
    conversationId: string | number,
    body: SpecialOfferCreateRequest,
    opts: { idempotencyKey?: string } = {},
  ): Promise<SpecialOffer> {
    return this.client.request<SpecialOffer>(
      'POST',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/special-offers`,
      { body, idempotencyKey: opts.idempotencyKey },
    );
  }

  /** GET /v1/conversations/{id}/special-offers/{offerId} — read one special offer. */
  get(conversationId: string | number, offerId: string): Promise<SpecialOffer> {
    return this.client.request<SpecialOffer>(
      'GET',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/special-offers/${encodeURIComponent(offerId)}`,
    );
  }

  /** DELETE /v1/conversations/{id}/special-offers/{offerId} — withdraw an offer the guest has not booked yet. */
  withdraw(conversationId: string | number, offerId: string): Promise<SpecialOfferWithdrawResponse> {
    return this.client.request<SpecialOfferWithdrawResponse>(
      'DELETE',
      `/v1/conversations/${encodeURIComponent(String(conversationId))}/special-offers/${encodeURIComponent(offerId)}`,
    );
  }
}

/** Airbnb inquiries — guests asking about a listing before booking. New in v0.2.16. */
class InquiriesNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/inquiries — cursor-paginated inquiry list. `status` defaults to
   * `open` server-side; pass `'all'` for every state. Answer an open inquiry
   * with `conversations.preApprove` or `conversations.specialOffers.create`.
   */
  list(
    query: {
      status?:
        | 'open'
        | 'pre_approved'
        | 'special_offer_sent'
        | 'booked'
        | 'expired'
        | 'declined'
        | 'not_possible'
        | 'all';
      listing_id?: number;
      conversation_id?: number;
      limit?: number;
      cursor?: string;
      include_total?: boolean;
    } = {},
  ): Promise<InquiryListResponse> {
    return this.client.request<InquiryListResponse>('GET', '/v1/inquiries', { query });
  }
}

/**
 * Guest CRM — the canonical guest record (name, email, phone, stays).
 */
class GuestsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/guests — cursor-paginated guest directory. */
  list(
    query: {
      limit?: number;
      cursor?: string;
      q?: string;
      has_reservation?: boolean;
      listing_id?: string | number;
      include_total?: boolean;
    } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Guest>> {
    return this.client.request<ListResponse<Guest>>('GET', '/v1/guests', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /** GET /v1/guests/{id} — full guest profile. */
  get(id: string | number, opts: { xSchema?: string } = {}): Promise<Guest> {
    return this.client.request<Guest>('GET', `/v1/guests/${encodeURIComponent(String(id))}`, {
      xSchema: opts.xSchema,
    });
  }

  /**
   * POST /v1/guests — create a guest, or match an existing one. New in v0.2.12.
   *
   * Only `firstName` is required. The API matches on email/phone plus name
   * before writing, so read `created` on the response rather than assuming a
   * 2xx means a new record was made. Email and phone come back as separate
   * entries in `contacts`.
   *
   * Pass `opts.idempotencyKey` (a UUID generated where you build the request)
   * to make a retry safe. The same key replays the stored response for 24
   * hours; the same key with a changed payload is rejected with
   * `422 idempotency_key_reused`.
   */
  create(
    body: GuestCreateRequest,
    opts: { idempotencyKey?: string; xSchema?: string } = {},
  ): Promise<GuestCreateResponse> {
    return this.client.request<GuestCreateResponse>('POST', '/v1/guests', {
      body,
      idempotencyKey: opts.idempotencyKey,
      xSchema: opts.xSchema,
    });
  }
}

/**
 * Channel-agnostic guest reviews. `/v1/reviews` aggregates Airbnb + Booking
 * + direct review channels into one cursor-paginated stream.
 */
class ReviewsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/reviews — cursor-paginated review stream across channels. */
  list(
    query: {
      limit?: number;
      cursor?: string;
      channel?: string;
      platform?: string;
      listing_id?: string | number;
      rating_min?: number;
      rating_max?: number;
      status?: 'responded' | 'unanswered' | 'all';
      reviewer_role?: 'guest' | 'host' | 'all';
      include_total?: boolean;
    } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Review>> {
    return this.client.request<ListResponse<Review>>('GET', '/v1/reviews', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /**
   * GET /v1/reviews/{id}.
   *
   * v0.2.0: the response is now the bare `Review` object (the v0.1.x
   * `{ data: Review }` envelope was removed for consistency with other
   * single-resource gets).
   */
  get(id: string | number, opts: { xSchema?: string } = {}): Promise<Review> {
    return this.client.request<Review>('GET', `/v1/reviews/${encodeURIComponent(String(id))}`, {
      xSchema: opts.xSchema,
    });
  }
}

class PropertiesNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/properties — cursor-paginated list.
   *
   * v0.2.0: migrated from `?offset=` to `?cursor=`. Pass
   * `pagination.nextCursor` back as `?cursor=`.
   */
  list(
    query: {
      limit?: number;
      cursor?: string;
      /** Defaults to `active`. `inactive` properties carry identity fields only. */
      status?: 'active' | 'inactive' | 'all';
      channel?: 'airbnb' | 'booking' | 'vrbo';
      include_total?: boolean;
    } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Property>> {
    return this.client.request<ListResponse<Property>>('GET', '/v1/properties', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /** GET /v1/properties/{id}. */
  get(id: string | number, opts: { xSchema?: string } = {}): Promise<Property> {
    return this.client.request<Property>(
      'GET',
      `/v1/properties/${encodeURIComponent(String(id))}`,
      { xSchema: opts.xSchema },
    );
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
  /** Booking.com property-level operations. New in v0.2.17. */
  readonly booking: BookingChannelNamespace;

  constructor(private readonly client: Repull) {
    this.airbnb = new AirbnbChannelNamespace(client);
    this.booking = new BookingChannelNamespace(client);
  }
}

class BookingChannelNamespace {
  readonly properties: BookingPropertiesNamespace;

  constructor(client: Repull) {
    this.properties = new BookingPropertiesNamespace(client);
  }
}

class BookingPropertiesNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/channels/booking/properties/{id} — take this listing's
   * Booking.com property off sale, or put it back. New in v0.2.17.
   *
   * `id` is a **Repull listing id**, not a Booking.com hotel id.
   *
   * **Booking.com has no unlist, so this is an availability write.** `unlist`
   * closes the mapped room across the whole forward window. `relist` is not
   * its mirror image: it re-syncs the true calendar, so dates that are
   * genuinely blocked (a reservation, an owner stay) stay blocked and only the
   * closure `unlist` wrote lifts — re-opening everything would sell dates that
   * are not for sale.
   *
   * **Which property gets closed.** A listing can be mapped to more than one
   * Booking.com property. With exactly one, send nothing. With several, name
   * one with `hotelId`; omit it and the request is refused with
   * `409 ambiguous_booking_mapping` listing the candidates, and nothing is
   * written — closing the wrong property's availability takes real inventory
   * off sale while the one you meant keeps selling. Naming a property this
   * listing is not mapped to is a `404` that names the ones it is.
   *
   * **This does not change the listing in Repull** — `active` is untouched by
   * both actions. To take a listing off the market on every channel at once,
   * use `repull.listings.offline(id)`.
   */
  action(
    id: string | number,
    body: BookingPropertyActionRequest,
  ): Promise<BookingPropertyActionResponse> {
    return this.client.request<BookingPropertyActionResponse>(
      'POST',
      `/v1/channels/booking/properties/${encodeURIComponent(String(id))}`,
      { body },
    );
  }

  /** `action(id, { action: 'unlist' })`. New in v0.2.17. */
  unlist(
    id: string | number,
    opts: { hotelId?: string } = {},
  ): Promise<BookingPropertyActionResponse> {
    return this.action(id, { action: 'unlist', ...opts });
  }

  /** `action(id, { action: 'relist' })`. New in v0.2.17. */
  relist(
    id: string | number,
    opts: { hotelId?: string } = {},
  ): Promise<BookingPropertyActionResponse> {
    return this.action(id, { action: 'relist', ...opts });
  }
}

class AirbnbChannelNamespace {
  readonly listings: AirbnbListingsNamespace;
  readonly alterations: AirbnbAlterationsNamespace;
  /** Airbnb pre-approvals / special offers by Airbnb id. New in v0.2.16. */
  readonly offers: AirbnbOffersNamespace;

  constructor(client: Repull) {
    this.listings = new AirbnbListingsNamespace(client);
    this.alterations = new AirbnbAlterationsNamespace(client);
    this.offers = new AirbnbOffersNamespace(client);
  }
}

class AirbnbOffersNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/channels/airbnb/offers?offerId= — read a pre-approval or special
   * offer straight from Airbnb by its Airbnb id (a live upstream read). Prefer
   * `repull.conversations.specialOffers.get(conversationId, offerId)` when you
   * have the conversation — it also confirms the offer belongs to it.
   */
  get(offerId: string): Promise<AirbnbOffer> {
    return this.client.request<AirbnbOffer>('GET', '/v1/channels/airbnb/offers', {
      query: { offerId },
    });
  }
}

/** Airbnb reservation alterations. New in v0.2.15. */
class AirbnbAlterationsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * POST /v1/channels/airbnb/alterations/{id}/cancel — withdraw an alteration
   * request you raised, before the other side has responded to it. New in
   * v0.2.15.
   *
   * Takes no fields. Use `accept` / `decline` on Airbnb for a request raised
   * by the guest; `cancel` is for one you raised yourself.
   */
  cancel(id: string | number): Promise<void> {
    return this.client.request<void>(
      'POST',
      `/v1/channels/airbnb/alterations/${encodeURIComponent(String(id))}/cancel`,
      { body: {} },
    );
  }
}

class AirbnbListingsNamespace {
  readonly bookingSettings: AirbnbBookingSettingsNamespace;
  readonly details: AirbnbListingDetailsNamespace;
  readonly descriptions: AirbnbDescriptionsNamespace;
  readonly photos: AirbnbPhotosNamespace;
  readonly rooms: AirbnbRoomsNamespace;
  readonly amenities: AirbnbAmenitiesNamespace;
  readonly permits: AirbnbPermitsNamespace;
  readonly safetyDisclosures: AirbnbSafetyDisclosuresNamespace;

  constructor(private readonly client: Repull) {
    this.bookingSettings = new AirbnbBookingSettingsNamespace(client);
    this.details = new AirbnbListingDetailsNamespace(client);
    this.descriptions = new AirbnbDescriptionsNamespace(client);
    this.photos = new AirbnbPhotosNamespace(client);
    this.rooms = new AirbnbRoomsNamespace(client);
    this.amenities = new AirbnbAmenitiesNamespace(client);
    this.permits = new AirbnbPermitsNamespace(client);
    this.safetyDisclosures = new AirbnbSafetyDisclosuresNamespace(client);
  }

  /**
   * GET /v1/channels/airbnb/listings — read-only Airbnb listing index with
   * `connections` info. v0.2.0: wraps in the canonical `{ data, pagination }`
   * envelope.
   *
   * This is a pure read of the local Airbnb mirror — it never calls Airbnb
   * upstream — so the response also carries a required `dataFreshness`.
   * Check `dataFreshness.stale` before trusting a null column: when it is
   * `true`, `dataFreshness.reason` says why and `dataFreshness.fixUrl` is the
   * dashboard screen that resolves it.
   */
  list(
    query: {
      limit?: number;
      cursor?: string;
      include_total?: boolean;
      /**
       * Comma-separated expansions. `amenities` adds the amenity arrays;
       * `thumbnail` guarantees `thumbnailUrl` is populated. New in v0.2.15.
       */
      include?: string;
      /**
       * Scope the read to ONE connected Airbnb account — the host id from
       * `connect.airbnb.status().accounts[].externalAccountId`. With it,
       * `dataFreshness.accounts[]` holds exactly that account. New in v0.2.15.
       */
      account_id?: string | number;
    } = {},
  ): Promise<AirbnbListingListResponse> {
    return this.client.request<AirbnbListingListResponse>('GET', '/v1/channels/airbnb/listings', {
      query,
    });
  }

  /** GET /v1/channels/airbnb/listings/{id}. */
  get(id: string | number): Promise<AirbnbListing> {
    return this.client.request<AirbnbListing>(
      'GET',
      `/v1/channels/airbnb/listings/${encodeURIComponent(String(id))}`,
    );
  }
}

/** Path prefix for the per-listing Airbnb content routes. */
function airbnbListingPath(id: string | number, suffix: string): string {
  return `/v1/channels/airbnb/listings/${encodeURIComponent(String(id))}${suffix}`;
}

/**
 * Airbnb booking settings — Instant Book, check-in/check-out windows,
 * advance notice, and the cancellation policy. New in v0.2.15.
 */
class AirbnbBookingSettingsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/booking-settings. */
  get(id: string | number): Promise<AirbnbBookingSettingsResult> {
    return this.client.request<AirbnbBookingSettingsResult>(
      'GET',
      airbnbListingPath(id, '/booking-settings'),
    );
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/booking-settings — partial update.
   *
   * A field you do not send is left alone; an unknown field is refused with
   * `422` rather than silently dropped, so a typo can never look like a
   * successful write. `cancellation.nonRefundable.enabled: true` requires a
   * `discountPercent` (capped at 30%, Airbnb's floor). The response's
   * `applied` names which upstream groups were written.
   */
  update(
    id: string | number,
    body: AirbnbBookingSettingsUpdateRequest,
  ): Promise<AirbnbBookingSettingsUpdateResult> {
    return this.client.request<AirbnbBookingSettingsUpdateResult>(
      'PUT',
      airbnbListingPath(id, '/booking-settings'),
      { body },
    );
  }
}

/**
 * Airbnb listing details — property type, room type, quiet hours, check-in
 * method. New in v0.2.15.
 */
class AirbnbListingDetailsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/channels/airbnb/listings/{id}/details.
   *
   * Read `data.lockedFields` before writing: those are the attributes Airbnb
   * manages on an established listing and will not let you change.
   */
  get(id: string | number): Promise<AirbnbListingDetailsResult> {
    return this.client.request<AirbnbListingDetailsResult>('GET', airbnbListingPath(id, '/details'));
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/details — at least one field.
   *
   * A 200 is not by itself proof the change landed: Airbnb answers 200 while
   * applying nothing for fields it locks. Read `blockedFields` on the
   * response — `[]` is what a landed write looks like. Airbnb validates
   * `property_type_category` against `property_type_group`, so send both when
   * changing the kind of property.
   */
  update(
    id: string | number,
    body: AirbnbListingDetailsWriteRequest,
  ): Promise<AirbnbContentWriteResponse> {
    return this.client.request<AirbnbContentWriteResponse>(
      'PUT',
      airbnbListingPath(id, '/details'),
      { body },
    );
  }
}

/** Airbnb per-locale listing copy. New in v0.2.15. */
class AirbnbDescriptionsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/descriptions. */
  list(
    id: string | number,
    query: { locale?: string; country?: string } = {},
  ): Promise<AirbnbDescriptionsResult> {
    return this.client.request<AirbnbDescriptionsResult>(
      'GET',
      airbnbListingPath(id, '/descriptions'),
      { query },
    );
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/descriptions — write ONE locale.
   *
   * Airbnb keeps a separate description per locale, which is why `locale` is
   * required: writing Italian copy into the English row is how a translation
   * gets lost. `description` itself is not accepted — Airbnb composes the
   * public description from the sections. Read `blockedFields` on the
   * response.
   */
  update(
    id: string | number,
    body: AirbnbDescriptionWriteRequest,
  ): Promise<AirbnbContentWriteResponse> {
    return this.client.request<AirbnbContentWriteResponse>(
      'PUT',
      airbnbListingPath(id, '/descriptions'),
      { body },
    );
  }
}

/** The Airbnb photo tour. New in v0.2.15. */
class AirbnbPhotosNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/photos. */
  list(id: string | number): Promise<unknown> {
    return this.client.request('GET', airbnbListingPath(id, '/photos'));
  }

  /**
   * PATCH /v1/channels/airbnb/listings/{id}/photos — change one photo's
   * caption, position, room, or metadata.
   *
   * `photo_id` is the Airbnb-side id (`photoAirbnbId` from the list), plus at
   * least one of `caption`, `sort_order`, `room_id`, `metadata`. `null`
   * clears a caption or detaches the photo from its room.
   */
  update(id: string | number, body: AirbnbPhotoUpdateRequest): Promise<AirbnbPhotoUpdateResult> {
    return this.client.request<AirbnbPhotoUpdateResult>('PATCH', airbnbListingPath(id, '/photos'), {
      body,
    });
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/photos/order — reorder the tour.
   *
   * Send every id you want ordered, first photo first. `sortOrder` is a
   * relative sort key, not an address, so the response's `order` includes
   * photos you did not name.
   */
  order(id: string | number, body: AirbnbPhotoOrderRequest): Promise<AirbnbPhotoOrderResult> {
    return this.client.request<AirbnbPhotoOrderResult>(
      'PUT',
      airbnbListingPath(id, '/photos/order'),
      { body },
    );
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/photos/cover — lead the tour with
   * one photo. `applied` comes back empty when it was already the cover.
   */
  setCover(id: string | number, body: AirbnbPhotoCoverRequest): Promise<AirbnbPhotoCoverResult> {
    return this.client.request<AirbnbPhotoCoverResult>(
      'PUT',
      airbnbListingPath(id, '/photos/cover'),
      { body },
    );
  }
}

/** Airbnb rooms and their sleeping arrangements. New in v0.2.15. */
class AirbnbRoomsNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/rooms. */
  list(id: string | number): Promise<AirbnbRoomsResult> {
    return this.client.request<AirbnbRoomsResult>('GET', airbnbListingPath(id, '/rooms'));
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/rooms — update one room. `roomId`
   * goes on the query string, as the API declares it.
   *
   * `beds` REPLACES the room's whole arrangement, so send every bed, not just
   * the changed one. A body that changes nothing is refused rather than
   * reported as a successful write.
   */
  update(
    id: string | number,
    roomId: string | number,
    body: AirbnbRoomUpdateRequest,
  ): Promise<AirbnbRoomUpdateResult> {
    return this.client.request<AirbnbRoomUpdateResult>('PUT', airbnbListingPath(id, '/rooms'), {
      query: { roomId: String(roomId) },
      body,
    });
  }
}

/** Airbnb amenities, including accessibility amenities. New in v0.2.15. */
class AirbnbAmenitiesNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/amenities. */
  list(id: string | number): Promise<AirbnbAmenitiesResult> {
    return this.client.request<AirbnbAmenitiesResult>('GET', airbnbListingPath(id, '/amenities'));
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/amenities.
   *
   * Every entry needs `is_present` — `true` claims the amenity, `false`
   * removes it — because an amenity with no verdict would be a silent no-op.
   * At least one amenity across `amenities` and `accessibility_amenities`.
   */
  update(
    id: string | number,
    body: AirbnbAmenitiesUpdateRequest,
  ): Promise<AirbnbAmenitiesUpdateResult> {
    return this.client.request<AirbnbAmenitiesUpdateResult>(
      'PUT',
      airbnbListingPath(id, '/amenities'),
      { body },
    );
  }
}

/** Airbnb regulatory permits and licences. New in v0.2.15. */
class AirbnbPermitsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/channels/airbnb/listings/{id}/permits — the permit questions
   * Airbnb asks for this listing. Pass `source: 'live'` to read them from
   * Airbnb: it refuses a `question_key` it did not ask for on this listing,
   * so read before you write.
   */
  list(id: string | number, query: { source?: string } = {}): Promise<AirbnbPermitsResult> {
    return this.client.request<AirbnbPermitsResult>('GET', airbnbListingPath(id, '/permits'), {
      query,
    });
  }

  /** PUT /v1/channels/airbnb/listings/{id}/permits — answer those questions. */
  update(
    id: string | number,
    body: AirbnbPermitsWriteRequest,
  ): Promise<AirbnbPermitsWriteResult> {
    return this.client.request<AirbnbPermitsWriteResult>(
      'PUT',
      airbnbListingPath(id, '/permits'),
      { body },
    );
  }
}

/** Guest-safety disclosures (cameras, weapons, hazards). New in v0.2.15. */
class AirbnbSafetyDisclosuresNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/channels/airbnb/listings/{id}/safety-disclosures. */
  list(id: string | number): Promise<AirbnbSafetyDisclosuresResult> {
    return this.client.request<AirbnbSafetyDisclosuresResult>(
      'GET',
      airbnbListingPath(id, '/safety-disclosures'),
    );
  }

  /**
   * PUT /v1/channels/airbnb/listings/{id}/safety-disclosures — a MERGE, not a
   * replacement.
   *
   * A disclosure type you leave out keeps the value it has; to retract one,
   * send it with `value: false`. Full replacement would let a partial request
   * silently un-declare a security camera, which is a guest-safety statement
   * rather than a preference.
   */
  update(
    id: string | number,
    body: AirbnbSafetyDisclosuresWriteRequest,
  ): Promise<AirbnbSafetyDisclosuresWriteResult> {
    return this.client.request<AirbnbSafetyDisclosuresWriteResult>(
      'PUT',
      airbnbListingPath(id, '/safety-disclosures'),
      { body },
    );
  }
}

/**
 * Atlas market intelligence — every market the workspace operates in plus
 * KPIs (own ADR vs market ADR, occupancy, ratings, share). Backed by Atlas,
 * Vanio's market-intelligence fleet.
 */
class MarketsNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/markets — overview of every market the customer has listings
   * in, plus discovery list of nearby Atlas-tracked markets.
   *
   * v0.2.0 reshape: per-city KPIs now live on `response.data` (canonical
   * envelope) instead of `response.markets`. Auxiliary fields (`totals`,
   * `myListings`, `browse`, `freeMarket`, `subscriptions`, `tier`) are
   * still siblings.
   */
  list(): Promise<MarketsResponse> {
    return this.client.request<MarketsResponse>('GET', '/v1/markets');
  }

  /**
   * GET /v1/markets/browse — paginated discovery catalog of every
   * Atlas-tracked market (>=5 active comps).
   *
   * v0.2.0: `pagination.total_in_filter` was renamed to `pagination.total`.
   */
  browse(
    query: {
      limit?: number;
      cursor?: string;
      q?: string;
      country?: string;
      sort?: 'listings_desc' | 'name_asc';
      include_total?: boolean;
    } = {},
  ): Promise<MarketBrowseResponse> {
    return this.client.request<MarketBrowseResponse>('GET', '/v1/markets/browse', { query });
  }
}

/**
 * Listings — cursor-paginated list + per-listing detail, plus Atlas
 * pricing recommendations (`repull.listings.pricing`).
 */
class ListingsNamespace {
  readonly pricing: ListingsPricingNamespace;

  constructor(private readonly client: Repull) {
    this.pricing = new ListingsPricingNamespace(client);
  }

  /**
   * GET /v1/listings — cursor-paginated list of listings owned by the
   * authenticated workspace. New top-level surface in v0.2.0 (the v0.1.x
   * facade only exposed `repull.listings.pricing`).
   */
  list(
    query: {
      limit?: number;
      cursor?: string;
      q?: string;
      /**
       * Defaults to `active`. `inactive` lists listings you can activate
       * (identity fields only); `all` returns every status.
       */
      status?: 'active' | 'inactive' | 'archived' | 'all';
      channel?: string;
      include_total?: boolean;
      /**
       * Comma-separated optional expansions: `content`, `details`,
       * `thumbnail`. `thumbnail` guarantees `thumbnailUrl` is populated.
       * New in v0.2.15.
       */
      include?: string;
    } = {},
    opts: { xSchema?: string } = {},
  ): Promise<ListResponse<Listing>> {
    return this.client.request<ListResponse<Listing>>('GET', '/v1/listings', {
      query,
      xSchema: opts.xSchema,
    });
  }

  /** GET /v1/listings/{id} — single listing. New in v0.2.0. */
  get(id: string | number, opts: { xSchema?: string } = {}): Promise<Listing> {
    return this.client.request<Listing>(
      'GET',
      `/v1/listings/${encodeURIComponent(String(id))}`,
      { xSchema: opts.xSchema },
    );
  }

  /**
   * DELETE /v1/listings/{id} — deactivate (exclude) a listing. New in v0.2.10.
   *
   * This is a soft toggle: the listing is marked inactive (freeing a slot
   * against the plan's listing cap), not hard-deleted. Reactivate it later
   * via `setActive(id, true)`. Returns the resulting `{ id, active }` state.
   */
  delete(id: string | number): Promise<ListingActiveResponse> {
    return this.client.request<ListingActiveResponse>(
      'DELETE',
      `/v1/listings/${encodeURIComponent(String(id))}`,
    );
  }

  /**
   * PATCH /v1/listings/{id} — set a listing's active state. New in v0.2.10.
   *
   * `active: false` deactivates (excludes) the listing; `active: true`
   * reactivates it (subject to the plan's listing cap — a 402 is thrown when
   * reactivating would exceed it). Returns the resulting `{ id, active }`.
   */
  setActive(id: string | number, active: boolean): Promise<ListingActiveResponse> {
    return this.client.request<ListingActiveResponse>(
      'PATCH',
      `/v1/listings/${encodeURIComponent(String(id))}`,
      { body: { active } },
    );
  }

  /**
   * PATCH /v1/listings/{id} — alias of `setActive` matching the
   * `repull.listings.update(id, { active })` shape. New in v0.2.10.
   */
  update(id: string | number, body: { active: boolean }): Promise<ListingActiveResponse> {
    return this.setActive(id, body.active);
  }

  /**
   * POST /v1/listings/status — activate or deactivate up to 500 listings in
   * one call. New in v0.2.14.
   *
   * All or nothing: an id outside this workspace fails the whole call with
   * 404, and activating past the plan's listing cap fails with 402
   * `listings_limit_exceeded`. Idempotent — ids already in the requested
   * state come back in `unchanged`, ids this call changed in `updated`.
   * Inactive listings keep syncing but cannot be read or written through the
   * API (403 `listing_inactive`) until activated.
   */
  setStatus(body: {
    listingIds: Array<string | number>;
    active: boolean;
  }): Promise<ListingStatusBatchResponse> {
    const payload: ListingStatusBatchRequest = {
      listingIds: body.listingIds.map((id) => String(id)),
      active: body.active,
    };
    return this.client.request<ListingStatusBatchResponse>('POST', '/v1/listings/status', {
      body: payload,
    });
  }

  /**
   * POST /v1/listings/{id}/pull/airbnb — refresh a listing from Airbnb. New
   * in v0.2.15.
   *
   * Reads the listing back off Airbnb and rewrites our stored copy from that
   * answer. Read `refreshedFromChannel`: `false` means Airbnb could not be
   * read this time (expired grant, read-only host, upstream error) and the
   * projection ran off the copy we already held — nothing is wrong with the
   * data, it simply is not newer than it was. `sections` lists what changed;
   * an empty array means Airbnb agreed with everything we held.
   *
   * Rate-limited per listing: calling again before `nextPullAvailableAt`
   * throws a 429. Pass `airbnbConnectionId` when a listing carries several
   * connections (merged properties, host migrations) — the ids come from
   * `GET /v1/listings/{id}/publish-status`.
   */
  pullFromAirbnb(
    id: string | number,
    body: ListingPullAirbnbRequest = {},
  ): Promise<ListingPullResponse> {
    return this.client.request<ListingPullResponse>(
      'POST',
      `/v1/listings/${encodeURIComponent(String(id))}/pull/airbnb`,
      { body },
    );
  }

  /**
   * POST /v1/listings/{id}/offline — stop this listing being sold, on every
   * channel it is connected to, in one call. New in v0.2.17.
   *
   * **Not the same as deactivating the listing in Repull.** Taking a listing
   * offline stops it taking bookings but leaves billing, plan limits and API
   * access untouched; `setActive(id, false)` does the opposite — the
   * guest-facing listing stays live and keeps selling, while the listing stops
   * being billed and returns `403 listing_inactive` through the API. Neither
   * deletes anything.
   *
   * What it means differs per channel and you do not have to know which is
   * which: on Airbnb the live listing is deactivated and then read back, so
   * "we sent the request" is never reported as success; on Booking.com there
   * is no unlist, so the mapped room is closed across the forward window.
   *
   * **The answer is per channel item.** A listing can sit on several Airbnb
   * connections and a Booking.com property at once; they fail independently
   * and a partial result is the ordinary outcome — check each `channels[]`
   * entry's `ok`, not just the HTTP status. Pass `hotelId` when the listing is
   * mapped to more than one Booking.com property, or the call is refused with
   * `409 ambiguous_booking_mapping` and nothing is written.
   */
  offline(
    id: string | number,
    body: ListingMarketStateRequest = {},
  ): Promise<ListingMarketStateResponse> {
    return this.client.request<ListingMarketStateResponse>(
      'POST',
      `/v1/listings/${encodeURIComponent(String(id))}/offline`,
      { body },
    );
  }

  /**
   * POST /v1/listings/{id}/online — put this listing back on sale, on every
   * channel it is connected to. Counterpart of `offline`. New in v0.2.17.
   *
   * **It does not push content.** On Airbnb it re-enables sync and makes the
   * listing available again, but anything that changed while the listing was
   * down is still unpublished — follow with a publish if the content moved.
   * On Booking.com it re-syncs the true calendar rather than opening
   * everything: dates genuinely blocked (a reservation, an owner stay) stay
   * blocked and only the closure `offline` wrote lifts. The two directions are
   * deliberately not mirror images.
   *
   * **One asymmetry worth planning for.** Taking a listing down passes no
   * billing gate; putting it back up goes through the channel-publish gate, so
   * on a lapsed subscription `offline` still works and this throws
   * `402 payment_required`. That refusal is a billing refusal with the action
   * that fixes it — retrying or reconnecting the channel does nothing for it.
   *
   * Throws `403 listing_inactive` when the listing is inactive.
   */
  online(
    id: string | number,
    body: ListingMarketStateRequest = {},
  ): Promise<ListingMarketStateResponse> {
    return this.client.request<ListingMarketStateResponse>(
      'POST',
      `/v1/listings/${encodeURIComponent(String(id))}/online`,
      { body },
    );
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

/**
 * Custom field-mapping schemas. Reshape the `native` response payload into
 * your app's preferred field names. After creating a schema, apply it to any
 * read endpoint by passing `{ xSchema: '<name>' }` as the trailing options
 * argument (e.g. `repull.reservations.list({}, { xSchema: 'my-schema' })`).
 *
 * Reserved names: `calry`, `calry-v1`, `native` are built-in and cannot be
 * used as a custom name. Mapping expressions are sandboxed — `eval`,
 * `Function`, `process`, etc. are rejected up front.
 */
class SchemasNamespace {
  constructor(private readonly client: Repull) {}

  /** GET /v1/schema/custom — list every custom schema owned by this workspace. */
  list(): Promise<CustomSchemaListResponse> {
    return this.client.request<CustomSchemaListResponse>('GET', '/v1/schema/custom');
  }

  /** GET /v1/schema/custom/{id} — single custom schema with full mappings. */
  get(id: string | number): Promise<CustomSchema> {
    return this.client.request<CustomSchema>(
      'GET',
      `/v1/schema/custom/${encodeURIComponent(String(id))}`,
    );
  }

  /** POST /v1/schema/custom — create a workspace-scoped field-mapping schema. */
  create(body: CustomSchemaCreate): Promise<CustomSchemaCreateResponse> {
    return this.client.request<CustomSchemaCreateResponse>('POST', '/v1/schema/custom', { body });
  }

  /**
   * PATCH /v1/schema/custom/{id} — update mappings or toggle active. `name`
   * is intentionally NOT patchable; create a new schema and migrate
   * consumers if you need to rename.
   */
  update(id: string | number, body: CustomSchemaUpdate): Promise<CustomSchema> {
    return this.client.request<CustomSchema>(
      'PATCH',
      `/v1/schema/custom/${encodeURIComponent(String(id))}`,
      { body },
    );
  }

  /**
   * DELETE /v1/schema/custom/{id} — hard delete. Subsequent requests
   * carrying its name in `X-Schema` fall back to `native`. There is no
   * undelete.
   */
  delete(id: string | number): Promise<CustomSchemaDeleteResponse> {
    return this.client.request<CustomSchemaDeleteResponse>(
      'DELETE',
      `/v1/schema/custom/${encodeURIComponent(String(id))}`,
    );
  }
}

// helpers

/** Options for `disconnect()` on the connect namespaces. */
export interface DisconnectOptions {
  /**
   * The account to disconnect: the Airbnb host id
   * (`status().accounts[].externalAccountId`) or the Booking.com hotel id.
   * Required when the workspace has more than one account for the provider.
   * Not the same as the `X-Account-Id` header.
   */
  accountId?: string | number;
}

function disconnectProvider(
  client: Repull,
  provider: string,
  opts: DisconnectOptions,
): Promise<ConnectDisconnectResponse> {
  return client.request<ConnectDisconnectResponse>(
    'DELETE',
    `/v1/connect/${encodeURIComponent(provider)}`,
    opts.accountId !== undefined ? { query: { accountId: String(opts.accountId) } } : {},
  );
}

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
