import { describe, it, expect } from 'vitest';
import { runReplayDeploy } from '../src/commands/deploy.js';
import { createMockApi, createMockRuntime } from './_mocks.js';
import { AdminApiError } from '../src/lib/api.js';

describe('runReplayDeploy', () => {
  it('replays a deployment and prints status', async () => {
    const { api, mocks } = createMockApi();
    mocks.replayDeployment.mockResolvedValue({
      ok: true,
      deployment_id: 'dep_x',
      new_deployment_id: 'dep_y',
      status: 'queued',
    });
    const rt = createMockRuntime({ api });
    const code = await runReplayDeploy('dep_x', {}, rt);
    expect(code).toBe(0);
    expect(mocks.replayDeployment).toHaveBeenCalledWith('dep_x');
    expect(rt.io.out.join('\n')).toMatch(/new_deployment_id/);
  });

  it('returns 1 with empty id', async () => {
    const rt = createMockRuntime();
    expect(await runReplayDeploy('', {}, rt)).toBe(1);
  });

  it('returns 2 on 404', async () => {
    const { api, mocks } = createMockApi();
    mocks.replayDeployment.mockRejectedValue(new AdminApiError(404, 'no such deploy', { error: 'no such deploy' }));
    const rt = createMockRuntime({ api });
    const code = await runReplayDeploy('dep_x', {}, rt);
    expect(code).toBe(2);
  });

  it('emits JSON when --json', async () => {
    const { api, mocks } = createMockApi();
    mocks.replayDeployment.mockResolvedValue({
      ok: true,
      deployment_id: 'dep_x',
      status: 'queued',
    });
    const rt = createMockRuntime({ api });
    await runReplayDeploy('dep_x', { json: true }, rt);
    const last = rt.io.out[rt.io.out.length - 1] ?? '';
    expect(JSON.parse(last)).toMatchObject({ deployment_id: 'dep_x', status: 'queued' });
  });
});
