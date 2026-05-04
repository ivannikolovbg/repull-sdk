import chalk from 'chalk';
import { readStudioConfig } from '../lib/config.js';
import type { CommandRuntime } from '../lib/runtime.js';

export interface LogsOptions {
  tail?: number;
}

export async function runLogs(opts: LogsOptions, rt: CommandRuntime): Promise<number> {
  const cfg = await readStudioConfig(rt.cwd());
  const apiKey = await rt.resolveApiKey();
  const api = rt.apiFactory(apiKey, cfg.api_url);

  const sp = rt.spinner('Finding latest deployment…').start();
  let latest;
  try {
    latest = await api.getLatestDeployment(cfg.project_id);
  } catch (err) {
    sp.fail('Failed to fetch deployments');
    rt.io.error(chalk.red('  ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
  if (!latest) {
    sp.fail('No deployments yet');
    rt.io.error(chalk.dim('  Run `repull studio deploy` first.'));
    return 1;
  }
  sp.succeed(`Tailing ${chalk.dim(latest.id)} (${latest.status})`);

  try {
    const res = await api.getLogs(latest.id, opts.tail);
    if (!res.logs?.length) {
      rt.io.log(chalk.dim('  (no logs yet)'));
      return 0;
    }
    for (const line of res.logs) {
      const color = pickLevelColor(line.level);
      const lvl = (line.level ?? 'info').toUpperCase().padEnd(5);
      rt.io.log(`${chalk.dim(line.timestamp)} ${color(lvl)} ${line.message}`);
    }
    return 0;
  } catch (err) {
    rt.io.error(chalk.red('error: ' + (err instanceof Error ? err.message : String(err))));
    return 1;
  }
}

function pickLevelColor(level: string | undefined): (s: string) => string {
  switch ((level ?? '').toLowerCase()) {
    case 'error':
    case 'fatal':
      return chalk.red;
    case 'warn':
    case 'warning':
      return chalk.yellow;
    case 'debug':
      return chalk.gray;
    default:
      return chalk.cyan;
  }
}
