import { describe, it, expect } from 'vitest';
import { runPurgeProject } from '../src/commands/project.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runPurgeProject', () => {
  it('skips confirm with --yes and calls purgeProject', async () => {
    const { api, mocks } = createMockApi();
    mocks.purgeProject.mockResolvedValue({
      ok: true,
      project_id: 'proj_x',
      purged_at: '2026-05-04T00:00:00.000Z',
      rows_deleted: 12,
    });
    const rt = createMockRuntime({ api });
    const code = await runPurgeProject('proj_x', { yes: true }, rt);
    expect(code).toBe(0);
    expect(rt.confirmCalls).toEqual([]);
    expect(mocks.purgeProject).toHaveBeenCalledWith('proj_x');
    expect(rt.io.out.join('\n')).toContain('rows_deleted');
  });

  it('asks confirm and proceeds when user accepts', async () => {
    const { api, mocks } = createMockApi();
    mocks.purgeProject.mockResolvedValue({
      ok: true,
      project_id: 'proj_x',
      purged_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api, confirm: true });
    const code = await runPurgeProject('proj_x', {}, rt);
    expect(code).toBe(0);
    expect(rt.confirmCalls).toHaveLength(1);
    expect(rt.confirmCalls[0]).toMatch(/Force-purge/);
  });

  it('aborts when user declines', async () => {
    const { api, mocks } = createMockApi();
    const rt = createMockRuntime({ api, confirm: false });
    const code = await runPurgeProject('proj_x', {}, rt);
    expect(code).toBe(1);
    expect(mocks.purgeProject).not.toHaveBeenCalled();
    expect(rt.io.err.join('\n')).toMatch(/Aborted/);
  });

  it('returns 1 with no project id', async () => {
    const rt = createMockRuntime();
    expect(await runPurgeProject('', { yes: true }, rt)).toBe(1);
  });

  it('returns 2 on 404 from API', async () => {
    const { api, mocks } = createMockApi();
    mocks.purgeProject.mockRejectedValue(new AdminApiError(404, 'not found', { error: 'not found' }));
    const rt = createMockRuntime({ api });
    const code = await runPurgeProject('proj_x', { yes: true }, rt);
    expect(code).toBe(2);
  });

  it('emits JSON output with --json', async () => {
    const { api, mocks } = createMockApi();
    mocks.purgeProject.mockResolvedValue({
      ok: true,
      project_id: 'proj_x',
      purged_at: '2026-05-04T00:00:00.000Z',
    });
    const rt = createMockRuntime({ api });
    await runPurgeProject('proj_x', { yes: true, json: true }, rt);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toMatchObject({ project_id: 'proj_x' });
  });
});
