import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import { promises as fs } from 'node:fs';
import { resolveApiKey, readGlobalAuth } from '../src/lib/auth.js';

describe('resolveApiKey', () => {
  it('prefers REPULL_API_KEY env var over the global config file', async () => {
    const key = await resolveApiKey({
      env: { REPULL_API_KEY: 'sk_env' },
      homedir: () => '/tmp/never',
    });
    expect(key).toBe('sk_env');
  });

  it('falls back to ~/.repull/config.json when no env var is set', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-auth-'));
    await fs.mkdir(path.join(tmp, '.repull'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, '.repull', 'config.json'),
      JSON.stringify({ api_key: 'sk_file' }),
      'utf8',
    );
    const key = await resolveApiKey({ env: {}, homedir: () => tmp });
    expect(key).toBe('sk_file');
  });

  it('throws a helpful error when neither source has a key', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-auth-empty-'));
    await expect(resolveApiKey({ env: {}, homedir: () => tmp })).rejects.toThrow(/REPULL_API_KEY/);
  });

  it('readGlobalAuth returns {} for a missing file', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-auth-missing-'));
    const cfg = await readGlobalAuth(() => tmp);
    expect(cfg).toEqual({});
  });
});
