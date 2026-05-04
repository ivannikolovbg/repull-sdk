/**
 * API key resolution.
 *
 * Resolution order:
 *   1. `REPULL_API_KEY` environment variable.
 *   2. `~/.repull/config.json` → `{ "api_key": "sk_live_..." }`.
 *
 * Throws a helpful error if neither is present.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface GlobalAuthConfig {
  api_key?: string;
}

export const GLOBAL_AUTH_DIR = '.repull';
export const GLOBAL_AUTH_FILE = 'config.json';

export interface AuthEnv {
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
}

export function globalAuthPath(homedirFn: () => string = os.homedir): string {
  return path.join(homedirFn(), GLOBAL_AUTH_DIR, GLOBAL_AUTH_FILE);
}

export async function readGlobalAuth(homedirFn: () => string = os.homedir): Promise<GlobalAuthConfig> {
  const filePath = globalAuthPath(homedirFn);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as GlobalAuthConfig;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return {};
    throw err;
  }
}

export async function resolveApiKey(deps: AuthEnv = {}): Promise<string> {
  const env = deps.env ?? process.env;
  const homedirFn = deps.homedir ?? os.homedir;
  const fromEnv = env.REPULL_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const cfg = await readGlobalAuth(homedirFn);
  const fromFile = cfg.api_key?.trim();
  if (fromFile) return fromFile;
  throw new Error(
    `No Repull API key found. Set REPULL_API_KEY or write ${globalAuthPath(homedirFn)} with { "api_key": "sk_live_..." }.`,
  );
}
