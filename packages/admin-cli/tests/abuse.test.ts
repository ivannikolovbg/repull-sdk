import { describe, it, expect } from 'vitest';
import { runAbuseList } from '../src/commands/abuse.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runAbuseList', () => {
  it('parses --since and forwards ISO to listAbuseSignals', async () => {
    const { api, mocks } = createMockApi();
    mocks.listAbuseSignals.mockResolvedValue([
      {
        id: 's1',
        customer_id: 10,
        kind: 'login_spam',
        severity: 'high',
        detected_at: '2026-05-03T18:00:00.000Z',
        message: 'too many failures',
      },
    ]);
    const rt = createMockRuntime({ api });
    const code = await runAbuseList({ since: '24h' }, rt);
    expect(code).toBe(0);
    expect(mocks.listAbuseSignals).toHaveBeenCalledWith('2026-05-03T00:00:00.000Z');
    // Default text mode should produce a table containing the kind
    expect(rt.io.out.join('\n')).toContain('login_spam');
  });

  it('emits JSON when requested', async () => {
    const { api, mocks } = createMockApi();
    mocks.listAbuseSignals.mockResolvedValue([
      { id: 's1', kind: 'k', severity: 'low', detected_at: 'now' },
    ]);
    const rt = createMockRuntime({ api });
    await runAbuseList({ since: '24h', json: true }, rt);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toEqual([
      { id: 's1', kind: 'k', severity: 'low', detected_at: 'now' },
    ]);
  });

  it('shows (none) when there are zero signals', async () => {
    const { api, mocks } = createMockApi();
    mocks.listAbuseSignals.mockResolvedValue([]);
    const rt = createMockRuntime({ api });
    await runAbuseList({}, rt);
    expect(rt.io.out.join('\n')).toContain('(none)');
  });

  it('returns 1 on bad --since', async () => {
    const rt = createMockRuntime();
    const code = await runAbuseList({ since: 'forever' }, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/Invalid --since/);
  });

  it('returns 2 when endpoint 404s', async () => {
    const { api, mocks } = createMockApi();
    mocks.listAbuseSignals.mockRejectedValue(new AdminApiError(404, 'nope', { error: 'nope' }));
    const rt = createMockRuntime({ api });
    const code = await runAbuseList({ since: '24h' }, rt);
    expect(code).toBe(2);
  });
});
