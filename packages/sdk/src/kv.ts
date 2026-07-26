/**
 * `repull.kv.*` — project-scoped key-value store.
 *
 * Use it to remember user preferences, feature flags, and small JSON state
 * from customer-built mini-apps without standing up a separate database.
 *
 *   const repull = new Repull({ apiKey });
 *   await repull.kv.set('theme', 'dark', { project_id: 'my-app' });
 *   const theme = await repull.kv.get<string>('theme', { project_id: 'my-app' });
 *   // 'dark'
 *
 * # Caps
 *
 *   - 64 KiB per row (key bytes + value JSON bytes)
 *   - 1 MiB per customer (sum across ALL projects+keys)
 *   - over either cap → the API throws a `RepullError` with code
 *     `payload_too_large` and HTTP 413
 *
 * # TTL
 *
 *   `kv.set(key, value, { ttl_seconds })` auto-expires the row after the
 *   given seconds. Past-TTL rows return `null` from `kv.get` and are
 *   filtered out of `kv.list`. `ttl_seconds: 0` is rejected up-front.
 *
 * # Project namespacing
 *
 *   `project_id` defaults to `'default'`. Pass any string the customer
 *   chooses (typically the Studio project id). Keys are scoped per
 *   `(customer, project)` pair — `theme` in project A is independent of
 *   `theme` in project B.
 *
 * # 404 vs missing
 *
 *   `kv.get` swallows 404s and returns `null` so the common
 *   "read-or-default" pattern stays one line:
 *
 *     const prefs = (await repull.kv.get<Prefs>('prefs')) ?? defaults;
 *
 *   Other errors (auth, rate limit, 5xx, 413) still throw `RepullError`.
 */

import type { Repull } from './client.js';
import { RepullError } from './errors.js';

export interface KvOptions {
  /** Project namespace. Defaults to `'default'`. */
  project_id?: string;
}

export interface KvSetOptions extends KvOptions {
  /** Optional TTL in seconds. Positive integer. Omit for no expiry. */
  ttl_seconds?: number;
}

export interface KvListOptions extends KvOptions {
  /** Restrict to keys starting with this string. */
  prefix?: string;
}

export interface KvClearOptions extends KvOptions {
  /** Required — the API rejects empty / missing prefix to prevent accidental wipes. */
  prefix?: string;
}

export interface KvEntry<T = unknown> {
  key: string;
  value: T;
  ttl_at: string | null;
  updated_at: string;
}

interface KvListResponse<T = unknown> {
  data: KvEntry<T>[];
  pagination: { total: number; has_more: boolean };
}

interface KvDeleteResponse {
  deleted: boolean;
}

interface KvClearResponse {
  deleted: number;
}

/**
 * Per-project key-value store. Wired as `repull.kv` on the main `Repull`
 * client.
 */
export class KvNamespace {
  constructor(private readonly client: Repull) {}

  /**
   * GET /v1/kv/{key}?project_id=X — read a single key.
   *
   * Returns `null` when the key does not exist OR is past its TTL.
   * Other errors still throw.
   */
  async get<T = unknown>(key: string, opts: KvOptions = {}): Promise<T | null> {
    const query = buildQuery(opts);
    try {
      const res = await this.client.request<KvEntry<T>>(
        'GET',
        `/v1/kv/${encodeURIComponent(key)}`,
        { query },
      );
      return res.value as T;
    } catch (err) {
      if (err instanceof RepullError && err.status === 404) return null;
      throw err;
    }
  }

  /**
   * PUT /v1/kv/{key}?project_id=X — upsert a single key.
   *
   * Pass `ttl_seconds` to auto-expire the row. The row is replaced fully —
   * there's no partial update.
   */
  async set<T = unknown>(key: string, value: T, opts: KvSetOptions = {}): Promise<void> {
    const query: Record<string, string> = {};
    if (opts.project_id) query.project_id = opts.project_id;
    const body: Record<string, unknown> = { value };
    if (opts.ttl_seconds !== undefined) body.ttl_seconds = opts.ttl_seconds;
    await this.client.request<KvEntry<T>>('PUT', `/v1/kv/${encodeURIComponent(key)}`, {
      query,
      body,
    });
  }

  /**
   * DELETE /v1/kv/{key}?project_id=X — remove a single key.
   *
   * Returns `true` if the row was present, `false` if it was already absent
   * (both are 200 — the operation is idempotent).
   */
  async delete(key: string, opts: KvOptions = {}): Promise<boolean> {
    const query = buildQuery(opts);
    const res = await this.client.request<KvDeleteResponse>(
      'DELETE',
      `/v1/kv/${encodeURIComponent(key)}`,
      { query },
    );
    return Boolean(res?.deleted);
  }

  /**
   * GET /v1/kv?project_id=X&prefix=Y — list every key in the project (or every
   * key under `prefix`). Hard cap of 1,000 rows per response.
   */
  async list<T = unknown>(opts: KvListOptions = {}): Promise<KvEntry<T>[]> {
    const query: Record<string, string> = buildQuery(opts);
    if (opts.prefix !== undefined) query.prefix = opts.prefix;
    const res = await this.client.request<KvListResponse<T>>('GET', '/v1/kv', { query });
    return res?.data ?? [];
  }

  /**
   * DELETE /v1/kv?project_id=X&prefix=Y — bulk-delete by prefix.
   *
   * `prefix` is required server-side. Pass it explicitly to avoid wiping the
   * whole project by accident.
   */
  async clear(opts: KvClearOptions = {}): Promise<number> {
    const query: Record<string, string> = buildQuery(opts);
    if (opts.prefix !== undefined) query.prefix = opts.prefix;
    const res = await this.client.request<KvClearResponse>('DELETE', '/v1/kv', { query });
    return Number(res?.deleted ?? 0);
  }
}

function buildQuery(opts: KvOptions): Record<string, string> {
  const out: Record<string, string> = {};
  if (opts.project_id) out.project_id = opts.project_id;
  return out;
}
