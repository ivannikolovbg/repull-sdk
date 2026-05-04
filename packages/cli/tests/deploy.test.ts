import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runDeploy } from '../src/commands/deploy.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-deploy-'));
  await writeStudioConfig({ project_id: 'proj_1', slug: 'mysite', api_url: 'https://api.example.com' }, dir);
  return dir;
}

describe('runDeploy', () => {
  it('polls until the deployment goes live and returns 0 with a URL', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.createDeployment.mockResolvedValue({
      id: 'dep_1',
      project_id: 'proj_1',
      status: 'queued',
    });
    const sequence = [
      { id: 'dep_1', project_id: 'proj_1', status: 'building' },
      { id: 'dep_1', project_id: 'proj_1', status: 'deploying' },
      { id: 'dep_1', project_id: 'proj_1', status: 'live', url: 'https://mysite.repull.app' },
    ];
    mocks.getDeployment.mockImplementation(async () => sequence.shift()!);
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runDeploy({ pollIntervalMs: 1, pollTimeoutMs: 5000 }, rt);
    expect(code).toBe(0);
    expect(mocks.getDeployment).toHaveBeenCalledTimes(3);
    expect(rt.io.out.join('\n')).toMatch(/mysite\.repull\.app/);
  });

  it('returns 1 when the deployment fails', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.createDeployment.mockResolvedValue({
      id: 'dep_2',
      project_id: 'proj_1',
      status: 'queued',
    });
    mocks.getDeployment.mockResolvedValue({
      id: 'dep_2',
      project_id: 'proj_1',
      status: 'failed',
      error: 'build script exited with code 1',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runDeploy({ pollIntervalMs: 1, pollTimeoutMs: 5000 }, rt);
    expect(code).toBe(1);
  });

  it('times out and returns 1 if the deployment never reaches a terminal state', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.createDeployment.mockResolvedValue({
      id: 'dep_3',
      project_id: 'proj_1',
      status: 'queued',
    });
    mocks.getDeployment.mockResolvedValue({
      id: 'dep_3',
      project_id: 'proj_1',
      status: 'building',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runDeploy({ pollIntervalMs: 1, pollTimeoutMs: 5 }, rt);
    expect(code).toBe(1);
  });

  it('returns 1 when the deployment trigger itself fails', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.createDeployment.mockRejectedValue(new Error('rate limited'));
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runDeploy({ pollIntervalMs: 1, pollTimeoutMs: 1000 }, rt);
    expect(code).toBe(1);
    expect(mocks.getDeployment).not.toHaveBeenCalled();
  });
});
