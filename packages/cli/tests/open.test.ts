import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runOpen } from '../src/commands/open.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-open-'));
  await writeStudioConfig({ project_id: 'proj_xyz', slug: 's', api_url: 'https://api.example.com' }, dir);
  return dir;
}

describe('runOpen', () => {
  it('opens https://repull.dev/studio/{project_id}', async () => {
    const dir = await setupProjectDir();
    const { api } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runOpen(rt);
    expect(code).toBe(0);
    expect(rt.openCalls).toEqual(['https://repull.dev/studio/proj_xyz']);
  });

  it('returns 1 when the opener throws and prints the URL for manual fallback', async () => {
    const dir = await setupProjectDir();
    const { api } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    rt.open = () => {
      throw new Error('xdg-open: not found');
    };
    const code = await runOpen(rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/Open it manually/);
    expect(rt.io.err.join('\n')).toMatch(/proj_xyz/);
  });
});
