/**
 * Studio project config persisted at ./repull-studio.json.
 *
 *   { "project_id": "proj_abc", "slug": "my-studio", "api_url": "https://api.repull.dev" }
 *
 * `api_url` is optional — defaults to `https://api.repull.dev` when missing.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export const STUDIO_CONFIG_FILENAME = 'repull-studio.json';
export const DEFAULT_API_URL = 'https://api.repull.dev';

export interface StudioProjectConfig {
  project_id: string;
  slug: string;
  api_url?: string;
}

export interface ResolvedStudioConfig extends StudioProjectConfig {
  api_url: string;
  cwd: string;
  filePath: string;
}

export async function readStudioConfig(cwd: string = process.cwd()): Promise<ResolvedStudioConfig> {
  const filePath = path.join(cwd, STUDIO_CONFIG_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      throw new Error(
        `No ${STUDIO_CONFIG_FILENAME} found in ${cwd}. Run \`repull studio init <name>\` first.`,
      );
    }
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${STUDIO_CONFIG_FILENAME} is not valid JSON.`);
  }
  const cfg = parsed as Partial<StudioProjectConfig> | null;
  if (!cfg || typeof cfg.project_id !== 'string' || typeof cfg.slug !== 'string') {
    throw new Error(
      `${STUDIO_CONFIG_FILENAME} is malformed — expected { project_id, slug, api_url? }.`,
    );
  }
  return {
    project_id: cfg.project_id,
    slug: cfg.slug,
    api_url: cfg.api_url ?? DEFAULT_API_URL,
    cwd,
    filePath,
  };
}

export async function writeStudioConfig(
  cfg: StudioProjectConfig,
  cwd: string = process.cwd(),
): Promise<string> {
  const filePath = path.join(cwd, STUDIO_CONFIG_FILENAME);
  const body = `${JSON.stringify(cfg, null, 2)}\n`;
  await fs.writeFile(filePath, body, 'utf8');
  return filePath;
}
