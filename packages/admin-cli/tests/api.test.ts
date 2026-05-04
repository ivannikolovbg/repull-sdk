import { describe, it, expect, vi } from 'vitest';
import { createAdminApi, AdminApiError, type FetchLike } from '../src/lib/api.js';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createAdminApi', () => {
  it('hits the suspend endpoint with bearer auth and reason body', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { ok: true, customer_id: 10, suspended_at: '2026-05-04T00:00:00.000Z', reason: 'fraud' }),
    );
    const api = createAdminApi({
      superadminToken: 'sk_admin_mock',
      apiUrl: 'https://api.repull.dev',
      fetch: fetchMock,
    });
    const result = await api.suspendCustomer(10, 'fraud');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toBe('https://api.repull.dev/api/superadmin/customer/10/suspend');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer sk_admin_mock',
    });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ reason: 'fraud' });
  });

  it('uses DELETE for unsuspend', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { ok: true, customer_id: 10, unsuspended_at: '2026-05-04T00:00:00.000Z' }),
    );
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await api.unsuspendCustomer(10);
    const [, init] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('purgeProject sends force flags', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { ok: true, project_id: 'proj_1', purged_at: 'now', rows_deleted: 42 }),
    );
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await api.purgeProject('proj_1');
    const [url, init] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toBe('https://api.repull.dev/api/superadmin/projects/proj_1/purge');
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      force: true,
      skip_soft_delete: true,
    });
  });

  it('listAbuseSignals appends since query param and unwraps signals[]', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { signals: [{ id: 's1', kind: 'login_spam', severity: 'high', detected_at: 'now' }] }),
    );
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    const signals = await api.listAbuseSignals('2026-05-03T00:00:00.000Z');
    expect(signals).toHaveLength(1);
    const [url] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toContain('since=2026-05-03T00%3A00%3A00.000Z');
  });

  it('queryAuditLog forwards customer + since + limit', async () => {
    const fetchMock: FetchLike = vi.fn(async () => jsonResponse(200, { entries: [] }));
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await api.queryAuditLog({ customerId: 10, since: '2026-04-27T00:00:00.000Z', limit: 50 });
    const [url] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toContain('customer_id=10');
    expect(String(url)).toContain('since=2026-04-27');
    expect(String(url)).toContain('limit=50');
  });

  it('replayDeployment posts to the replay route', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { ok: true, deployment_id: 'dep_x', status: 'queued' }),
    );
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await api.replayDeployment('dep_x');
    const [url, init] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toBe('https://api.repull.dev/api/superadmin/deployments/dep_x/replay');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('drainHost posts to the drain route', async () => {
    const fetchMock: FetchLike = vi.fn(async () =>
      jsonResponse(200, { ok: true, host_id: 'host_a', drained_at: 'now' }),
    );
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await api.drainHost('host_a');
    const [url] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toBe('https://api.repull.dev/api/superadmin/hosts/host_a/drain');
  });

  it('throws AdminApiError with status + body on non-2xx', async () => {
    const fetchMock: FetchLike = vi.fn(async () => jsonResponse(404, { error: 'route not found' }));
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await expect(api.purgeProject('proj_404')).rejects.toMatchObject({
      name: 'AdminApiError',
      status: 404,
      message: 'route not found',
    });
  });

  it('falls back to a synthetic message when the body is empty', async () => {
    const fetchMock: FetchLike = vi.fn(async () => new Response('', { status: 500 }));
    const api = createAdminApi({ superadminToken: 't', apiUrl: 'https://api.repull.dev', fetch: fetchMock });
    await expect(api.purgeProject('proj_500')).rejects.toThrow(/failed with 500/);
  });

  it('strips trailing slashes off apiUrl', async () => {
    const fetchMock: FetchLike = vi.fn(async () => jsonResponse(200, { ok: true, customer_id: 1, unsuspended_at: 'now' }));
    const api = createAdminApi({
      superadminToken: 't',
      apiUrl: 'https://api.repull.dev/////',
      fetch: fetchMock,
    });
    await api.unsuspendCustomer(1);
    const [url] = (fetchMock as unknown as Mock).mock.calls[0]!;
    expect(String(url)).toBe('https://api.repull.dev/api/superadmin/customer/1/suspend');
  });
});

// Local type for vitest's mock typings without importing types twice
type Mock = { mock: { calls: unknown[][] } };

it('AdminApiError exposes structured fields', () => {
  const err = new AdminApiError(401, 'bad token', { error: 'bad token' });
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe('AdminApiError');
  expect(err.status).toBe(401);
  expect(err.body).toEqual({ error: 'bad token' });
});
