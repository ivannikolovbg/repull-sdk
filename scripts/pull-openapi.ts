/**
 * Snapshots https://api.repull.dev/openapi.json into openapi/v1.json.
 * Run via `pnpm codegen` from the monorepo root.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCE = process.env.REPULL_OPENAPI_URL ?? 'https://api.repull.dev/openapi.json';
const DEST = resolve(process.cwd(), 'openapi/v1.json');

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE}: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  await writeFile(DEST, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`Snapshotted OpenAPI spec from ${SOURCE} -> ${DEST}`);
  console.log(`info.version = ${(json as { info?: { version?: string } })?.info?.version ?? '(missing)'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
