import { describe, it, expect } from 'vitest';
import { runDrainHost } from '../src/commands/host.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runDrainHost', () => {
  it('drains the host with --yes', async () => {
    const { api, mocks } = createMockApi();
    mocks.drainHost.mockResolvedValue({
      ok: true,
      host_id: 'host_a',
      drained_at: '2026-05-04T00:00:00.000Z',
      containers_evacuated: 4,
    });
    const rt = createMockRuntime({ api });
    const code = await runDrainHost('host_a', { yes: true }, rt);
    expect(code).toBe(0);
    expect(rt.confirmCalls).toEqual([]);
    expect(rt.io.out.join('\n')).toContain('containers_evacuated');
  });

  it('asks confirm before draining without --yes', async () => {
    const { api, mocks } = createMockApi();
    mocks.drainHost.mockResolvedValue({
      ok: true,
      host_id: 'host_a',
      drained_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api, confirm: true });
    await runDrainHost('host_a', {}, rt);
    expect(rt.confirmCalls).toHaveLength(1);
    expect(rt.confirmCalls[0]).toMatch(/Drain/);
  });

  it('aborts when confirm is declined', async () => {
    const { api, mocks } = createMockApi();
    const rt = createMockRuntime({ api, confirm: false });
    const code = await runDrainHost('host_a', {}, rt);
    expect(code).toBe(1);
    expect(mocks.drainHost).not.toHaveBeenCalled();
  });

  it('returns 1 with no host id', async () => {
    const rt = createMockRuntime();
    expect(await runDrainHost('', { yes: true }, rt)).toBe(1);
  });

  it('returns 2 on 404', async () => {
    const { api, mocks } = createMockApi();
    mocks.drainHost.mockRejectedValue(new AdminApiError(404, 'gone', { error: 'gone' }));
    const rt = createMockRuntime({ api });
    expect(await runDrainHost('host_a', { yes: true }, rt)).toBe(2);
  });
});
