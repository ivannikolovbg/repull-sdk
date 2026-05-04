import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { readStudioConfig, writeStudioConfig, DEFAULT_API_URL } from '../src/lib/config.js';

async function tmpDir(prefix = 'repull-cfg-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe('studio config', () => {
  it('writes and reads a project config round-trip', async () => {
    const dir = await tmpDir();
    const written = await writeStudioConfig(
      { project_id: 'proj_1', slug: 'my-site', api_url: 'https://api.example.com' },
      dir,
    );
    expect(written.endsWith('repull-studio.json')).toBe(true);
    const cfg = await readStudioConfig(dir);
    expect(cfg.project_id).toBe('proj_1');
    expect(cfg.slug).toBe('my-site');
    expect(cfg.api_url).toBe('https://api.example.com');
  });

  it('defaults api_url to https://api.repull.dev when omitted', async () => {
    const dir = await tmpDir();
    await fs.writeFile(
      path.join(dir, 'repull-studio.json'),
      JSON.stringify({ project_id: 'p', slug: 's' }),
      'utf8',
    );
    const cfg = await readStudioConfig(dir);
    expect(cfg.api_url).toBe(DEFAULT_API_URL);
  });

  it('throws a guiding error when the config is missing', async () => {
    const dir = await tmpDir('repull-cfg-missing-');
    await expect(readStudioConfig(dir)).rejects.toThrow(/repull studio init/);
  });

  it('rejects malformed config files', async () => {
    const dir = await tmpDir('repull-cfg-bad-');
    await fs.writeFile(path.join(dir, 'repull-studio.json'), '{ "project_id": 5 }', 'utf8');
    await expect(readStudioConfig(dir)).rejects.toThrow(/malformed/);
  });
});
