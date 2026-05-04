import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runLogs } from '../src/commands/logs.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-logs-'));
  await writeStudioConfig({ project_id: 'proj_1', slug: 's', api_url: 'https://api.example.com' }, dir);
  return dir;
}

describe('runLogs', () => {
  it('prints log lines from the latest deployment', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.getLatestDeployment.mockResolvedValue({
      id: 'dep_1',
      project_id: 'proj_1',
      status: 'live',
    });
    mocks.getLogs.mockResolvedValue({
      deployment_id: 'dep_1',
      logs: [
        { timestamp: '2026-05-04T10:00:00Z', level: 'info', message: 'started build' },
        { timestamp: '2026-05-04T10:00:02Z', level: 'error', message: 'whoops' },
      ],
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runLogs({ tail: 10 }, rt);
    expect(code).toBe(0);
    expect(mocks.getLogs).toHaveBeenCalledWith('dep_1', 10);
    const out = rt.io.out.join('\n');
    expect(out).toMatch(/started build/);
    expect(out).toMatch(/whoops/);
  });

  it('returns 1 when there is no deployment yet', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.getLatestDeployment.mockResolvedValue(null);
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runLogs({ tail: 50 }, rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/repull studio deploy/);
  });

  it('reports a friendly message when the log array is empty', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.getLatestDeployment.mockResolvedValue({
      id: 'dep_x',
      project_id: 'proj_1',
      status: 'queued',
    });
    mocks.getLogs.mockResolvedValue({ deployment_id: 'dep_x', logs: [] });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runLogs({ tail: 100 }, rt);
    expect(code).toBe(0);
    expect(rt.io.out.join('\n')).toMatch(/no logs yet/);
  });
});
