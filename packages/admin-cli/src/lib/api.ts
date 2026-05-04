/**
 * Thin superadmin API client used by repull-admin.
 *
 * Endpoints (all under `${apiUrl}`):
 *   - POST   /api/superadmin/customer/{id}/suspend         → suspend customer
 *   - DELETE /api/superadmin/customer/{id}/suspend         → unsuspend customer
 *   - POST   /api/superadmin/projects/{id}/purge           → force purge project (skip soft-delete)
 *   - GET    /api/superadmin/abuse-signals?since=...       → list abuse signals
 *   - GET    /api/superadmin/studio/audit-log?...          → query audit log
 *   - POST   /api/superadmin/deployments/{id}/replay       → re-trigger a failed deployment
 *   - POST   /api/superadmin/hosts/{id}/drain              → mark host unhealthy / drain containers
 *
 * All routes require Authorization: Bearer ${SUPERADMIN_TOKEN}.
 *
 * The fetch impl is injectable so tests can mock the wire without monkey-patching globals.
 */

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface AdminApiOptions {
  superadminToken: string;
  apiUrl: string;
  fetch?: FetchLike;
  userAgent?: string;
}

export interface SuspendResult {
  ok: true;
  customer_id: number | string;
  suspended_at: string;
  reason?: string;
}

export interface UnsuspendResult {
  ok: true;
  customer_id: number | string;
  unsuspended_at: string;
}

export interface PurgeResult {
  ok: true;
  project_id: string;
  purged_at: string;
  rows_deleted?: number;
}

export interface ReplayResult {
  ok: true;
  deployment_id: string;
  new_deployment_id?: string;
  status: string;
}

export interface DrainResult {
  ok: true;
  host_id: string;
  drained_at: string;
  containers_evacuated?: number;
}

export interface AbuseSignal {
  id: string;
  customer_id?: number | string;
  kind: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  detected_at: string;
  message?: string;
}

export interface AuditLogEntry {
  id: string;
  customer_id?: number | string;
  actor?: string;
  action: string;
  target?: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.body = body;
  }
}

export interface AdminApi {
  suspendCustomer(customerId: string | number, reason?: string): Promise<SuspendResult>;
  unsuspendCustomer(customerId: string | number): Promise<UnsuspendResult>;
  purgeProject(projectId: string): Promise<PurgeResult>;
  listAbuseSignals(since?: string): Promise<AbuseSignal[]>;
  queryAuditLog(input: { customerId?: string | number; since?: string; limit?: number }): Promise<AuditLogEntry[]>;
  replayDeployment(deploymentId: string): Promise<ReplayResult>;
  drainHost(hostId: string): Promise<DrainResult>;
}

export function createAdminApi(opts: AdminApiOptions): AdminApi {
  const fetchImpl: FetchLike = opts.fetch ?? ((globalThis.fetch as FetchLike | undefined) ?? failNoFetch);
  const baseUrl = opts.apiUrl.replace(/\/+$/, '');
  const userAgent = opts.userAgent ?? '@repull/admin-cli/0.1.0';

  async function request<T>(
    method: string,
    pathname: string,
    init: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${baseUrl}${pathname}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${opts.superadminToken}`,
      Accept: 'application/json',
      'User-Agent': userAgent,
    };
    let body: BodyInit | undefined;
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }
    const res = await fetchImpl(url.toString(), { method, headers, body });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const message = extractErrorMessage(parsed) ?? `${method} ${pathname} failed with ${res.status}`;
      throw new AdminApiError(res.status, message, parsed);
    }
    return parsed as T;
  }

  return {
    suspendCustomer(customerId, reason) {
      return request<SuspendResult>(
        'POST',
        `/api/superadmin/customer/${encodeURIComponent(String(customerId))}/suspend`,
        { body: reason ? { reason } : {} },
      );
    },
    unsuspendCustomer(customerId) {
      return request<UnsuspendResult>(
        'DELETE',
        `/api/superadmin/customer/${encodeURIComponent(String(customerId))}/suspend`,
      );
    },
    purgeProject(projectId) {
      return request<PurgeResult>(
        'POST',
        `/api/superadmin/projects/${encodeURIComponent(projectId)}/purge`,
        { body: { force: true, skip_soft_delete: true } },
      );
    },
    listAbuseSignals(since) {
      return request<{ signals: AbuseSignal[] }>(
        'GET',
        `/api/superadmin/abuse-signals`,
        { query: { since } },
      ).then((r) => r.signals ?? []);
    },
    queryAuditLog({ customerId, since, limit }) {
      return request<{ entries: AuditLogEntry[] }>(
        'GET',
        `/api/superadmin/studio/audit-log`,
        {
          query: {
            customer_id: customerId !== undefined ? String(customerId) : undefined,
            since,
            limit,
          },
        },
      ).then((r) => r.entries ?? []);
    },
    replayDeployment(deploymentId) {
      return request<ReplayResult>(
        'POST',
        `/api/superadmin/deployments/${encodeURIComponent(deploymentId)}/replay`,
        { body: {} },
      );
    },
    drainHost(hostId) {
      return request<DrainResult>(
        'POST',
        `/api/superadmin/hosts/${encodeURIComponent(hostId)}/drain`,
        { body: {} },
      );
    },
  };
}

function extractErrorMessage(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;
  return undefined;
}

function failNoFetch(): Promise<Response> {
  return Promise.reject(
    new Error('No global fetch available. Run on Node 20+ or pass a custom fetch.'),
  );
}
