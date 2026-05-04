import chalk from 'chalk';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';

const STUDIO_IDE_BASE = 'https://repull.dev/studio';

export async function runOpen(rt: CommandRuntime): Promise<number> {
  const cfg = await readStudioConfig(rt.cwd());
  const url = `${STUDIO_IDE_BASE}/${cfg.project_id}`;
  rt.io.log(`Opening ${chalk.cyan(url)}…`);
  try {
    await rt.open(url);
    return 0;
  } catch (err) {
    rt.io.error(chalk.red('error: ' + (err instanceof Error ? err.message : String(err))));
    rt.io.error(chalk.dim(`  Open it manually: ${url}`));
    return 1;
  }
}
