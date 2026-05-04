import { describe, it, expect } from 'vitest';
import { runAuditQuery } from '../src/commands/audit.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runAuditQuery', () => {
  it('passes customer + since + limit through', async () => {
    const { api, mocks } = createMockApi();
    mocks.queryAuditLog.mockResolvedValue([
      {
        id: 'a1',
        customer_id: 10,
        actor: 'user@ivan',
        action: 'project.delete',
        target: 'proj_42',
        occurred_at: '2026-05-01T00:00:00.000Z',
      },
    ]);
    const rt = createMockRuntime({ api });
    const code = await runAuditQuery({ customer: '10', since: '7d', limit: 50 }, rt);
    expect(code).toBe(0);
    expect(mocks.queryAuditLog).toHaveBeenCalledWith({
      customerId: '10',
      since: '2026-04-27T00:00:00.000Z',
      limit: 50,
    });
    expect(rt.io.out.join('\n')).toContain('project.delete');
  });

  it('shows (none) when there are zero entries', async () => {
    const { api, mocks } = createMockApi();
    mocks.queryAuditLog.mockResolvedValue([]);
    const rt = createMockRuntime({ api });
    await runAuditQuery({}, rt);
    expect(rt.io.out.join('\n')).toContain('(none)');
  });

  it('emits JSON', async () => {
    const { api, mocks } = createMockApi();
    mocks.queryAuditLog.mockResolvedValue([
      { id: 'a1', action: 'login', occurred_at: 'now' },
    ]);
    const rt = createMockRuntime({ api });
    await runAuditQuery({ json: true }, rt);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toHaveLength(1);
  });

  it('returns 1 on bad --since', async () => {
    const rt = createMockRuntime();
    expect(await runAuditQuery({ since: 'whenever' }, rt)).toBe(1);
  });

  it('returns 2 when endpoint 404s', async () => {
    const { api, mocks } = createMockApi();
    mocks.queryAuditLog.mockRejectedValue(new AdminApiError(404, 'gone', { error: 'gone' }));
    const rt = createMockRuntime({ api });
    expect(await runAuditQuery({}, rt)).toBe(2);
  });
});
