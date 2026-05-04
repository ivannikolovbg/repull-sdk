import { describe, it, expect } from 'vitest';
import { runSuspend, runUnsuspend } from '../src/commands/customer.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runSuspend', () => {
  it('calls suspendCustomer with reason and returns 0', async () => {
    const { api, mocks } = createMockApi();
    mocks.suspendCustomer.mockResolvedValue({
      ok: true,
      customer_id: 10,
      suspended_at: '2026-05-04T00:00:00.000Z',
      reason: 'fraud',
    });
    const rt = createMockRuntime({ api });
    const code = await runSuspend('10', { reason: 'fraud' }, rt);
    expect(code).toBe(0);
    expect(mocks.suspendCustomer).toHaveBeenCalledWith('10', 'fraud');
    expect(rt.io.out.join('\n')).toContain('customer_id');
  });

  it('emits JSON when --json passed', async () => {
    const { api, mocks } = createMockApi();
    mocks.suspendCustomer.mockResolvedValue({
      ok: true,
      customer_id: 10,
      suspended_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api });
    await runSuspend('10', { json: true }, rt);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toMatchObject({ ok: true, customer_id: 10 });
  });

  it('returns 1 with empty customer id', async () => {
    const rt = createMockRuntime();
    const code = await runSuspend('', {}, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/customer id is required/);
  });

  it('returns 2 on 404 endpoint and prints actionable hint', async () => {
    const { api, mocks } = createMockApi();
    mocks.suspendCustomer.mockRejectedValue(new AdminApiError(404, 'not found', { error: 'not found' }));
    const rt = createMockRuntime({ api });
    const code = await runSuspend('10', {}, rt);
    expect(code).toBe(2);
    expect(rt.io.err.join('\n')).toMatch(/superadmin route is not deployed/);
  });

  it('returns 1 on generic error', async () => {
    const { api, mocks } = createMockApi();
    mocks.suspendCustomer.mockRejectedValue(new Error('boom'));
    const rt = createMockRuntime({ api });
    const code = await runSuspend('10', {}, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toContain('boom');
  });
});

describe('runUnsuspend', () => {
  it('calls unsuspendCustomer and returns 0', async () => {
    const { api, mocks } = createMockApi();
    mocks.unsuspendCustomer.mockResolvedValue({
      ok: true,
      customer_id: 10,
      unsuspended_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api });
    const code = await runUnsuspend('10', {}, rt);
    expect(code).toBe(0);
    expect(mocks.unsuspendCustomer).toHaveBeenCalledWith('10');
  });

  it('returns 1 with missing customer id', async () => {
    const rt = createMockRuntime();
    expect(await runUnsuspend('', {}, rt)).toBe(1);
  });
});
