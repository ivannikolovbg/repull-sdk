import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { runPush } from '../src/commands/push.js';
import { writeStudioConfig } from '../src/lib/config.js';
import { createMockApi, createMockRuntime } from './_mocks.js';

async function setupProjectDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-push-'));
  await writeStudioConfig({ project_id: 'proj_1', slug: 's', api_url: 'https://api.example.com' }, dir);
  return dir;
}

describe('runPush', () => {
  it('uploads a text file with utf8 encoding', async () => {
    const dir = await setupProjectDir();
    const filePath = path.join(dir, 'index.html');
    await fs.writeFile(filePath, '<h1>hi</h1>');
    const { api, mocks } = createMockApi();
    mocks.putFile.mockResolvedValue({ ok: true, path: 'index.html' });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPush('index.html', rt);
    expect(code).toBe(0);
    expect(mocks.putFile).toHaveBeenCalledTimes(1);
    const [projectId, payload] = mocks.putFile.mock.calls[0]!;
    expect(projectId).toBe('proj_1');
    expect(payload).toMatchObject({
      path: 'index.html',
      content: '<h1>hi</h1>',
      encoding: 'utf8',
    });
  });

  it('uploads a binary file as base64', async () => {
    const dir = await setupProjectDir();
    const filePath = path.join(dir, 'logo.bin');
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await fs.writeFile(filePath, bytes);
    const { api, mocks } = createMockApi();
    mocks.putFile.mockResolvedValue({ ok: true, path: 'logo.bin' });
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPush('logo.bin', rt);
    expect(code).toBe(0);
    const [, payload] = mocks.putFile.mock.calls[0]!;
    expect(payload.encoding).toBe('base64');
    expect(Buffer.from(payload.content, 'base64').equals(bytes)).toBe(true);
  });

  it('returns 1 when no path is provided', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPush(undefined, rt);
    expect(code).toBe(1);
    expect(mocks.putFile).not.toHaveBeenCalled();
    expect(rt.io.err.join('\n')).toMatch(/push requires a file path/);
  });

  it('returns 1 when the file does not exist', async () => {
    const dir = await setupProjectDir();
    const { api, mocks } = createMockApi();
    const rt = createMockRuntime({ cwd: dir, api });
    const code = await runPush('does-not-exist.txt', rt);
    expect(code).toBe(1);
    expect(mocks.putFile).not.toHaveBeenCalled();
  });
});
