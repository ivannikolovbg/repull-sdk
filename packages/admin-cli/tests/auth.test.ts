import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  resolveSuperadminToken,
  resolveApiUrl,
  readAdminAuth,
  adminAuthPath,
} from '../src/lib/auth.js';

describe('auth', () => {
  let tmpHome: string;
  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'repull-admin-home-'));
    await fs.mkdir(path.join(tmpHome, '.repull'), { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(tmpHome, { recursive: true, force: true });
  });

  it('prefers SUPERADMIN_TOKEN env var', async () => {
    const token = await resolveSuperadminToken({
      env: { SUPERADMIN_TOKEN: 'sk_admin_env' },
      homedir: () => tmpHome,
    });
    expect(token).toBe('sk_admin_env');
  });

  it('falls back to ~/.repull/admin.json', async () => {
    await fs.writeFile(
      path.join(tmpHome, '.repull', 'admin.json'),
      JSON.stringify({ superadmin_token: 'sk_admin_file' }),
    );
    const token = await resolveSuperadminToken({ env: {}, homedir: () => tmpHome });
    expect(token).toBe('sk_admin_file');
  });

  it('throws a helpful error when nothing is configured', async () => {
    await expect(resolveSuperadminToken({ env: {}, homedir: () => tmpHome })).rejects.toThrow(
      /No superadmin token found/,
    );
  });

  it('readAdminAuth returns {} when the file is missing', async () => {
    const cfg = await readAdminAuth(() => tmpHome);
    expect(cfg).toEqual({});
  });

  it('adminAuthPath joins to ~/.repull/admin.json', () => {
    expect(adminAuthPath(() => '/home/x')).toBe('/home/x/.repull/admin.json');
  });

  it('resolveApiUrl falls back to api.repull.dev', async () => {
    const url = await resolveApiUrl({ env: {}, homedir: () => tmpHome });
    expect(url).toBe('https://api.repull.dev');
  });

  it('resolveApiUrl honours REPULL_ADMIN_API_URL', async () => {
    const url = await resolveApiUrl({
      env: { REPULL_ADMIN_API_URL: 'https://staging.repull.dev' },
      homedir: () => tmpHome,
    });
    expect(url).toBe('https://staging.repull.dev');
  });

  it('resolveApiUrl reads api_url from admin.json', async () => {
    await fs.writeFile(
      path.join(tmpHome, '.repull', 'admin.json'),
      JSON.stringify({ api_url: 'https://internal.repull.dev' }),
    );
    const url = await resolveApiUrl({ env: {}, homedir: () => tmpHome });
    expect(url).toBe('https://internal.repull.dev');
  });
});
