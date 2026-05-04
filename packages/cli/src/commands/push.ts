import chalk from 'chalk';
import * as path from 'node:path';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';

export async function runPush(target: string | undefined, rt: CommandRuntime): Promise<number> {
  const cfg = await readStudioConfig(rt.cwd());
  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, cfg.api_url);

  let files: string[];
  if (target && target.trim()) {
    files = [target];
  } else {
    rt.io.error(chalk.red('error:') + ' push requires a file path. Example: `repull studio push src/index.html`');
    rt.io.error(chalk.dim('  (bulk push will land in a future release.)'));
    return 1;
  }

  const sp = rt.spinner(`Uploading ${files.length} file(s)…`).start();
  let uploaded = 0;
  try {
    for (const rel of files) {
      const abs = path.isAbsolute(rel) ? rel : path.join(rt.cwd(), rel);
      const buf = await rt.fs.readFile(abs);
      const remotePath = path.relative(rt.cwd(), abs).split(path.sep).join('/');
      const isText = looksLikeText(buf);
      await api.putFile(cfg.project_id, {
        path: remotePath,
        content: isText ? buf.toString('utf8') : buf.toString('base64'),
        encoding: isText ? 'utf8' : 'base64',
      });
      uploaded += 1;
    }
    sp.succeed(`Pushed ${chalk.green(String(uploaded))} file(s)`);
    return 0;
  } catch (err) {
    sp.fail('Push failed');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}

function looksLikeText(buf: Buffer): boolean {
  // Cheap heuristic: no NULs in the first 8KiB → treat as text.
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return false;
  }
  return true;
}
