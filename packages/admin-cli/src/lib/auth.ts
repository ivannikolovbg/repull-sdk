/**
 * Superadmin token resolution.
 *
 * Resolution order:
 *   1. `SUPERADMIN_TOKEN` environment variable.
 *   2. `~/.repull/admin.json` → `{ "superadmin_token": "sk_admin_..." }`.
 *
 * Throws a helpful error if neither is present.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface AdminAuthConfig {
  superadmin_token?: string;
  api_url?: string;
}

export const ADMIN_AUTH_DIR = '.repull';
export const ADMIN_AUTH_FILE = 'admin.json';

export interface AuthDeps {
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
}

export function adminAuthPath(homedirFn: () => string = os.homedir): string {
  return path.join(homedirFn(), ADMIN_AUTH_DIR, ADMIN_AUTH_FILE);
}

export async function readAdminAuth(homedirFn: () => string = os.homedir): Promise<AdminAuthConfig> {
  const filePath = adminAuthPath(homedirFn);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as AdminAuthConfig;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return {};
    throw err;
  }
}

export async function resolveSuperadminToken(deps: AuthDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const homedirFn = deps.homedir ?? os.homedir;
  const fromEnv = env.SUPERADMIN_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await readAdminAuth(homedirFn);
  const fromFile = cfg.superadmin_token?.trim();
  if (fromFile) return fromFile;
  throw new Error(
    `No superadmin token found. Set SUPERADMIN_TOKEN or write ${adminAuthPath(homedirFn)} with { "superadmin_token": "sk_admin_..." }.`,
  );
}

export async function resolveApiUrl(deps: AuthDeps = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const homedirFn = deps.homedir ?? os.homedir;
  const fromEnv = env.REPULL_ADMIN_API_URL?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await readAdminAuth(homedirFn);
  return cfg.api_url?.trim() || 'https://api.repull.dev';
}
