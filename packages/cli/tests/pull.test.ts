import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runPull } from '../src/commands/pull.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-pull-'));
  await writeStudioConfig({ project_id: 'proj_1', slug: 's', api_url: 'https://api.example.com' }, dir);
  return dir;
}

describe('runPull', () => {
  it('downloads each listed file and writes it under cwd', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.listFiles.mockResolvedValue([
      { path: 'index.html' },
      { path: 'src/app.ts' },
    ]);
    mocks.getFile.mockImplementation(async (_proj: string, p: string) => ({
      path: p,
      content: `// content of ${p}`,
      encoding: 'utf8',
    }));
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPull(rt);
    expect(code).toBe(0);
    expect(mocks.getFile).toHaveBeenCalledTimes(2);
    const idx = await fs.readFile(path.join(dir, 'index.html'), 'utf8');
    expect(idx).toContain('content of index.html');
    const app = await fs.readFile(path.join(dir, 'src/app.ts'), 'utf8');
    expect(app).toContain('content of src/app.ts');
  });

  it('decodes base64 files into binary buffers', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.listFiles.mockResolvedValue([{ path: 'logo.png' }]);
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    mocks.getFile.mockResolvedValue({
      path: 'logo.png',
      content: bytes.toString('base64'),
      encoding: 'base64',
    });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPull(rt);
    expect(code).toBe(0);
    const out = await fs.readFile(path.join(dir, 'logo.png'));
    expect(Buffer.compare(out, bytes)).toBe(0);
  });

  it('returns 0 with a friendly note when project has no files', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.listFiles.mockResolvedValue([]);
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPull(rt);
    expect(code).toBe(0);
    expect(rt.io.out.join('\n')).toMatch(/no files yet/);
  });

  it('returns 1 when listing fails', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    mocks.listFiles.mockRejectedValue(new Error('boom'));
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPull(rt);
    expect(code).toBe(1);
    expect(rt.io.err.join('\n')).toMatch(/boom/);
  });
});
